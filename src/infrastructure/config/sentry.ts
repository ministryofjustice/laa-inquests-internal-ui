import * as Sentry from "@sentry/node";
import type {
  Breadcrumb,
  BreadcrumbHint,
  ErrorEvent,
  EventHint,
  NodeOptions,
} from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import config from "#src/infrastructure/config/config.js";
import {
  FILTERED,
  redactText,
  referenceTags,
  sanitizePath,
} from "#src/infrastructure/config/sentryPaths.js";

const TRACES_SAMPLE_RATE = 0.02;
const PROFILE_SESSION_SAMPLE_RATE = 0.2;
const NO_FRAME_CONTEXT_LINES = 0;

// The text of these errors can name users, tenants or token details, so the
// whole message is replaced. This list covers the msal-node error classes; an
// error with the msal shape (errorCode and errorMessage) is caught as well.
const MSAL_ERROR_NAMES = new Set([
  "AuthError",
  "ClientAuthError",
  "ClientConfigurationError",
  "InteractionRequiredAuthError",
  "ServerError",
]);

const ZOD_ERROR_NAMES = new Set(["ZodError", "$ZodError"]);

const URL_DATA_KEYS = ["url", "url.full", "http.url"];

const SAFE_CODE = /^[A-Za-z0-9_.\-]{1,64}$/v;
const ZOD_ISSUE_CODE = /^[a-z_]{1,40}$/v;
const ZOD_PATH_KEY = /^[A-Za-z_]\w{0,60}$/v;
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

type SpanData = Record<string, unknown>;
type Integration = Extract<NodeOptions["integrations"], unknown[]>[number];
type StreamedSpan = Parameters<NonNullable<NodeOptions["beforeSendSpan"]>>[0];
type ErrorException = NonNullable<
  NonNullable<ErrorEvent["exception"]>["values"]
>[number];

const parseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const isApiUrl = (url: string): boolean => {
  const apiHost = parseUrl(config.INQUESTS_API_URL)?.host;
  return apiHost !== undefined && parseUrl(url)?.host === apiHost;
};

// Credentials, query string and fragment are always dropped. The path is kept
// (sanitized) for our own services; other hosts keep only scheme and host, as
// their paths can hold tenant ids or signatures.
const scrubUrl = (url: string, keepPath: boolean): string => {
  const parsed = parseUrl(url);
  if (parsed === undefined) {
    return FILTERED;
  }

  const origin = `${parsed.protocol}//${parsed.host}`;
  return keepPath ? `${origin}${sanitizePath(parsed.pathname)}` : origin;
};

const firstUrl = (data: SpanData): string | undefined => {
  for (const key of URL_DATA_KEYS) {
    const { [key]: value } = data;
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
};

const requestPath = (data: SpanData): string | undefined => {
  const { "url.path": urlPath } = data;
  if (typeof urlPath === "string") {
    return urlPath;
  }

  const url = firstUrl(data);
  return url === undefined ? undefined : parseUrl(url)?.pathname;
};

// Query strings and fragments never reach here: dataCollection.urlQueryParams
// is off, so the SDK never collects them in the first place.
const scrubUrlData = (data: SpanData, keepPath: boolean): void => {
  for (const key of URL_DATA_KEYS) {
    const { [key]: value } = data;
    if (typeof value === "string") {
      data[key] = scrubUrl(value, keepPath);
    }
  }

  const { "url.path": urlPath } = data;
  if (keepPath && typeof urlPath === "string") {
    data["url.path"] = sanitizePath(urlPath);
  } else {
    delete data["url.path"];
  }
};

// Names such as "GET /applications/INQ-ABC-123" embed the raw path. The route
// template is preferred so Sentry groups by route and not by case; without one
// the sanitized path is used.
const withoutRawPath = (
  name: string,
  rawPath: string | undefined,
  route: unknown,
): string => {
  if (rawPath === undefined || rawPath === "/" || !name.includes(rawPath)) {
    return name;
  }
  return name.replace(
    rawPath,
    typeof route === "string" ? route : sanitizePath(rawPath),
  );
};

// Query string, cookies, headers and body never reach here: dataCollection
// turns their collection off entirely, so there is nothing left to delete.
const scrubRequest = (event: ErrorEvent): string | undefined => {
  const { request } = event;
  if (typeof request?.url !== "string") {
    return undefined;
  }

  const rawPath = parseUrl(request.url)?.pathname;
  request.url = scrubUrl(request.url, true);
  return rawPath;
};

const scrubTraceContext = (
  event: ErrorEvent,
  rawPath: string | undefined,
): void => {
  const traceData = event.contexts?.trace?.data;
  if (traceData !== undefined) {
    scrubUrlData(traceData, true);
  }

  if (event.transaction !== undefined) {
    event.transaction = withoutRawPath(
      event.transaction,
      rawPath,
      traceData?.["http.route"],
    );
  }
};

const hasStringProperty = (error: object, key: string): boolean =>
  typeof (error as Record<string, unknown>)[key] === "string";

const hasMsalShape = (error: unknown): error is Error =>
  error instanceof Error &&
  hasStringProperty(error, "errorCode") &&
  hasStringProperty(error, "errorMessage");

const isMsalError = (type: string | undefined, original: unknown): boolean =>
  (type !== undefined && MSAL_ERROR_NAMES.has(type)) || hasMsalShape(original);

interface ZodIssueLike {
  code: unknown;
  path: unknown;
}

const zodIssues = (error: unknown): ZodIssueLike[] | undefined => {
  const { issues } = (error ?? {}) as { issues?: unknown };
  return Array.isArray(issues) ? (issues as ZodIssueLike[]) : undefined;
};

// Issue codes and field paths only: never the rejected values or the messages.
// Array indexes and keys that are not plain identifiers become "*".
const zodPathKey = (key: unknown): string =>
  typeof key === "string" && ZOD_PATH_KEY.test(key) ? key : "*";

const zodSummary = (issues: ZodIssueLike[]): string =>
  issues
    .map(({ code, path }) => {
      const safeCode =
        typeof code === "string" && ZOD_ISSUE_CODE.test(code) ? code : "issue";
      const keys = Array.isArray(path) ? path.map(zodPathKey) : [];
      return `${safeCode} at ${keys.join(".") || "(root)"}`;
    })
    .join("; ");

const sanitizeException = (
  exception: ErrorException,
  original: unknown,
): void => {
  if (exception.value === undefined) {
    return;
  }

  if (isMsalError(exception.type, original)) {
    exception.value = FILTERED;
  } else if (
    exception.type !== undefined &&
    ZOD_ERROR_NAMES.has(exception.type)
  ) {
    const issues = zodIssues(original);
    exception.value = issues === undefined ? FILTERED : zodSummary(issues);
  } else {
    exception.value = redactText(exception.value);
  }
};

// Sentry lists chained causes first and the thrown error last; only the thrown
// error is available as hint.originalException.
const sanitizeExceptions = (event: ErrorEvent, hint: EventHint): void => {
  const values = event.exception?.values ?? [];
  values.forEach((exception, index) => {
    const isThrownError = index === values.length - 1;
    sanitizeException(
      exception,
      isThrownError ? hint.originalException : undefined,
    );
  });
};

// Stable, non-sensitive facts about the failure that the scrubbed message no
// longer carries.
const errorTags = (error: unknown): Record<string, string> => {
  const tags: Record<string, string> = {};
  if (hasMsalShape(error)) {
    const { errorCode } = error as unknown as { errorCode: string };
    if (SAFE_CODE.test(errorCode)) {
      tags.auth_error_code = errorCode;
    }
  }

  const { isAxiosError, code, status } = (error ?? {}) as Record<
    string,
    unknown
  >;
  if (isAxiosError === true) {
    if (typeof code === "string" && SAFE_CODE.test(code)) {
      tags.axios_code = code;
    }
    if (
      typeof status === "number" &&
      status >= MIN_HTTP_STATUS &&
      status <= MAX_HTTP_STATUS
    ) {
      tags.http_status = String(status);
    }
  }
  return tags;
};

interface ApplicationErrorFields {
  type: string;
  operation: string;
  retryable: boolean;
}

// instrument.js and app.js are separate bundles, so each has its own
// ApplicationError class and `instanceof` cannot be used.
const asApplicationError = (
  error: unknown,
): ApplicationErrorFields | undefined => {
  if (!(error instanceof Error) || error.name !== "ApplicationError") {
    return undefined;
  }

  const { type, operation, retryable } =
    error as Partial<ApplicationErrorFields>;
  if (
    typeof type === "string" &&
    typeof operation === "string" &&
    typeof retryable === "boolean"
  ) {
    return { type, operation, retryable };
  }
  return undefined;
};

// Every ApplicationError has the same message and stack, so without these the
// outcomes (forbidden, not found, upstream failure) are indistinguishable and
// Sentry's Dedupe drops one as a repeat of the other. The fields are stable
// and non-sensitive. This must run before Dedupe, so it is applied from an
// integration's preprocessEvent hook rather than from beforeSend.
export const tagApplicationError = (
  event: ErrorEvent,
  hint: EventHint,
): void => {
  const fields = asApplicationError(hint.originalException);
  if (fields === undefined) {
    return;
  }

  event.tags = {
    ...event.tags,
    error_type: fields.type,
    operation: fields.operation,
    retryable: fields.retryable,
  };
  event.fingerprint = ["{{ default }}", fields.type];
};

export const scrubEvent = (event: ErrorEvent, hint: EventHint): ErrorEvent => {
  const rawPath = scrubRequest(event);
  scrubTraceContext(event, rawPath);
  if (event.message !== undefined) {
    event.message = redactText(event.message);
  }

  const tags = {
    ...referenceTags(rawPath ?? ""),
    ...errorTags(hint.originalException),
  };
  if (Object.keys(tags).length > 0) {
    event.tags = { ...event.tags, ...tags };
  }

  sanitizeExceptions(event, hint);
  return event;
};

export const scrubBreadcrumb = (
  breadcrumb: Breadcrumb,
  _hint?: BreadcrumbHint,
): Breadcrumb => {
  const { data } = breadcrumb;
  if (data !== undefined) {
    const { url } = data;
    scrubUrlData(data, typeof url === "string" && isApiUrl(url));
  }

  return breadcrumb;
};

// "GET https://host/path" keeps the sanitized path for our own API and only the
// host otherwise. A bare path has no known host, so it is dropped.
const outboundSpanName = (name: string): string => {
  const separator = name.indexOf(" ");
  if (separator === -1) {
    return name;
  }

  const method = name.slice(0, separator);
  const target = name.slice(separator + 1);
  if (target.includes("://")) {
    return `${method} ${scrubUrl(target, isApiUrl(target))}`;
  }
  return target.startsWith("/") ? method : name;
};

export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  const { attributes } = span;
  const { "http.route": route } = attributes;
  const rawPath = requestPath(attributes);
  const isOutbound = attributes["sentry.op"] === "http.client";
  const url = firstUrl(attributes);
  const keepPath = !isOutbound || (url !== undefined && isApiUrl(url));

  if (keepPath && rawPath !== undefined) {
    Object.assign(attributes, referenceTags(rawPath));
  }
  scrubUrlData(attributes, keepPath);

  if (isOutbound) {
    span.name = outboundSpanName(span.name);
    return span;
  }

  span.name = withoutRawPath(span.name, rawPath, route);
  const { "sentry.segment.name": segmentName } = attributes;
  if (typeof segmentName === "string") {
    attributes["sentry.segment.name"] = withoutRawPath(
      segmentName,
      rawPath,
      route,
    );
  }

  return span;
};

export const applicationErrorTagsIntegration = (): Integration => ({
  name: "ApplicationErrorTags",
  preprocessEvent: (event, hint) => {
    if (event.exception !== undefined) {
      tagApplicationError(event as ErrorEvent, hint ?? {});
    }
  },
});

// Every error that passes through Express is reported, including the ones the
// default only skips: errors that carry a 4xx status.
export const shouldHandleExpressError = (_error: unknown): boolean => true;

export const sentryConfig: NodeOptions = {
  dsn: config.SENTRY_DSN,
  // Logs are already written to stdout as JSON; do not duplicate them in Sentry.
  beforeSendLog: () => null,
  // The console integration is removed so log output (which carries LAA
  // references) does not become breadcrumbs. The default express integration is
  // replaced so that errors with a 4xx status are reported too.
  integrations: (defaults) => [
    ...defaults.filter(({ name }) => name !== "Console" && name !== "Express"),
    Sentry.expressIntegration({ shouldHandleError: shouldHandleExpressError }),
    applicationErrorTagsIntegration(),
    nodeProfilingIntegration(),
  ],
  beforeSend: scrubEvent,
  beforeSendSpan: scrubSpan,
  beforeBreadcrumb: scrubBreadcrumb,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  profileSessionSampleRate: PROFILE_SESSION_SAMPLE_RATE,
  profileLifecycle: "trace",
  // This is dev, staging, prod or suppliertest. It is set from the
  // ENVIRONMENT env var, passed in by deploy.sh.
  environment: config.ENVIRONMENT,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    graphQL: { document: false, variables: false },
    queues: false,
    // Locals include the raw request (Authorization header, session, query string).
    stackFrameVariables: false,
    frameContextLines: NO_FRAME_CONTEXT_LINES,
  },
};

export const initSentry = (options: NodeOptions = sentryConfig): boolean => {
  if (options.dsn === undefined || options.dsn === "") {
    return false;
  }

  Sentry.init(options);
  return true;
};
