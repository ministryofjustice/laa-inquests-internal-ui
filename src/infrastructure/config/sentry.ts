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

const TRACES_SAMPLE_RATE = 0.02;
const PROFILE_SESSION_SAMPLE_RATE = 0.2;
const NO_FRAME_CONTEXT_LINES = 0;
const FILTERED = "[Filtered]";

// Exceptions from these libraries embed request URLs (which contain LAA
// references), the rejected input values, or token and tenant details.
const SENSITIVE_EXCEPTION_TYPES = new Set([
  "AxiosError",
  "ZodError",
  "$ZodError",
  "AuthError",
  "ClientAuthError",
  "ClientConfigurationError",
  "InteractionRequiredAuthError",
  "ServerError",
]);

const URL_DATA_KEYS = ["url", "url.full", "http.url"];
const URL_DETAIL_DATA_KEYS = [
  "url.path",
  "url.query",
  "url.fragment",
  "http.query",
  "http.fragment",
  "http.target",
];

type SpanData = Record<string, unknown>;
type Integration = Extract<NodeOptions["integrations"], unknown[]>[number];
type StreamedSpan = Parameters<NonNullable<NodeOptions["beforeSendSpan"]>>[0];

// Outbound URLs carry LAA references, file names and signatures.
const hostOnly = (url: string): string | undefined => {
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return undefined;
  }
};

const removeUrlDetails = (data: SpanData): void => {
  for (const key of URL_DETAIL_DATA_KEYS) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- keys are a fixed list
    delete data[key];
  }
};

const reduceUrlsToHost = (data: SpanData): void => {
  for (const key of URL_DATA_KEYS) {
    const { [key]: value } = data;
    if (typeof value === "string") {
      data[key] = hostOnly(value) ?? FILTERED;
    }
  }
  removeUrlDetails(data);
};

const removeAllUrlData = (data: SpanData): void => {
  for (const key of URL_DATA_KEYS) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- keys are a fixed list
    delete data[key];
  }
  removeUrlDetails(data);
};

const pathOf = (url: unknown): string | undefined => {
  if (typeof url !== "string") {
    return undefined;
  }
  try {
    const { pathname } = new URL(url, "http://placeholder");
    return pathname === "/" ? undefined : pathname;
  } catch {
    return undefined;
  }
};

// Names such as "GET /applications/LAA-123" embed the raw path. A route template
// is used instead when the SDK knows it; otherwise the path is dropped.
const withoutRawPath = (
  name: string,
  rawPath: string | undefined,
  route: unknown,
): string => {
  if (rawPath === undefined || !name.includes(rawPath)) {
    return name;
  }
  return name.replace(rawPath, typeof route === "string" ? route : FILTERED);
};

const scrubRequest = (event: ErrorEvent): string | undefined => {
  const { request } = event;
  if (request === undefined) {
    return undefined;
  }

  const rawPath = pathOf(request.url);
  if (typeof request.url === "string") {
    request.url = hostOnly(request.url) ?? FILTERED;
  }
  delete request.query_string;
  delete request.cookies;
  delete request.headers;
  delete request.data;
  return rawPath;
};

const filterSensitiveExceptions = (event: ErrorEvent): void => {
  for (const exception of event.exception?.values ?? []) {
    if (
      exception.type !== undefined &&
      SENSITIVE_EXCEPTION_TYPES.has(exception.type)
    ) {
      exception.value = FILTERED;
    }
  }
};

const scrubTraceContext = (
  event: ErrorEvent,
  rawPath: string | undefined,
): void => {
  const traceData = event.contexts?.trace?.data;
  if (traceData === undefined) {
    return;
  }

  const { "http.route": route } = traceData;
  removeAllUrlData(traceData);
  if (event.transaction !== undefined) {
    event.transaction = withoutRawPath(event.transaction, rawPath, route);
  }
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

export const scrubEvent = (event: ErrorEvent, _hint: EventHint): ErrorEvent => {
  const rawPath = scrubRequest(event);
  delete event.user;
  delete event.extra;

  if (
    event.contexts?.trace?.data === undefined &&
    event.transaction !== undefined
  ) {
    event.transaction = withoutRawPath(event.transaction, rawPath, undefined);
  }
  scrubTraceContext(event, rawPath);
  filterSensitiveExceptions(event);

  return event;
};

export const scrubBreadcrumb = (
  breadcrumb: Breadcrumb,
  _hint?: BreadcrumbHint,
): Breadcrumb => {
  if (breadcrumb.data !== undefined) {
    reduceUrlsToHost(breadcrumb.data);
  }

  return breadcrumb;
};

// "GET https://host/path" -> "GET https://host"; a bare path is dropped.
const outboundSpanName = (name: string): string => {
  const separator = name.indexOf(" ");
  if (separator === -1) {
    return name;
  }

  const method = name.slice(0, separator);
  const target = name.slice(separator + 1);
  if (target.includes("://")) {
    return `${method} ${hostOnly(target) ?? FILTERED}`;
  }
  return target.startsWith("/") ? method : name;
};

export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  const { attributes } = span;
  const { "url.path": urlPath, "http.route": route } = attributes;
  const rawPath = pathOf(urlPath);

  if (attributes["sentry.op"] === "http.client") {
    reduceUrlsToHost(attributes);
    span.name = outboundSpanName(span.name);
  } else {
    removeAllUrlData(attributes);
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
