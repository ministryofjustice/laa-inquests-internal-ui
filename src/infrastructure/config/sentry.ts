import * as Sentry from "@sentry/node";
import type { ErrorEvent, EventHint, NodeOptions } from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import config from "#src/infrastructure/config/config.js";

const TRACES_SAMPLE_RATE = 0.02;
const PROFILE_SESSION_SAMPLE_RATE = 0.2;
const NO_FRAME_CONTEXT_LINES = 0;

const SAFE_CODE = /^[A-Za-z0-9_.\-]{1,64}$/v;
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

type SpanData = Record<string, unknown>;
type Integration = Extract<NodeOptions["integrations"], unknown[]>[number];
type StreamedSpan = Parameters<NonNullable<NodeOptions["beforeSendSpan"]>>[0];

const FILTERED = "[Filtered]";

// Defence in depth for exception messages that no type specific rule covers
// (Node and Redis connection errors, future messages with interpolated values).
// It cannot detect names or file names.
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/gv, "[Email]"],
  [/\bBearer\s+[\w.~+\/\-]+=*/giv, "Bearer [Token]"],
  [/\bBasic\s+[A-Za-z0-9+\/]+=*/gv, "Basic [Token]"],
  [/\beyJ[\w\-]+\.[\w\-]+\.[\w\-]*/gv, "[Token]"],
  [
    /\b(client_secret|password|access_token|refresh_token|id_token)\s*[=:]\s*[^&\s]+/giv,
    "$1=[Redacted]",
  ],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/gv, "[IP]"],
  [/\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/gv, "[IP]"],
  [
    /(?<![\w:])(?:[A-Fa-f0-9]{1,4}:){1,7}:(?:[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{1,4}){0,6})?(?![\w:])/gv,
    "[IP]",
  ],
  [
    /(?<![\w:])::(?:[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{1,4}){0,6})(?![\w:])/gv,
    "[IP]",
  ],
];

export const redactText = (text: string): string =>
  REDACTIONS.reduce(
    (redacted, [pattern, replacement]) =>
      redacted.replace(pattern, replacement),
    text,
  );

// -- URL helpers: only this app's own API keeps its path; every other host
// (MSAL, anything else) can carry tenant ids or signatures in the path --

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

const scrubUrl = (url: string, keepPath: boolean): string => {
  const parsed = parseUrl(url);
  if (parsed === undefined) {
    return FILTERED;
  }

  const origin = `${parsed.protocol}//${parsed.host}`;
  return keepPath ? `${origin}${parsed.pathname}` : origin;
};

// Query strings and fragments never reach here: dataCollection.urlQueryParams
// is off, so the SDK never collects them in the first place.
const scrubUrlData = (data: SpanData, keepPath: boolean): void => {
  const { "url.full": url } = data;
  if (typeof url === "string") {
    data["url.full"] = scrubUrl(url, keepPath);
  }

  if (!keepPath) {
    delete data["url.path"];
  }
};

// -- Error event scrubbing --

// Query string, cookies, headers and body never reach here: dataCollection
// turns their collection off entirely, so there is nothing left to delete.
const scrubRequest = (event: ErrorEvent): void => {
  const { request } = event;
  if (typeof request?.url === "string") {
    request.url = scrubUrl(request.url, true);
  }
};

const scrubTraceContext = (event: ErrorEvent): void => {
  const traceData = event.contexts?.trace?.data;
  if (traceData !== undefined) {
    scrubUrlData(traceData, true);
  }
};

const sanitizeExceptions = (event: ErrorEvent): void => {
  event.exception?.values?.forEach((exception) => {
    if (exception.value !== undefined) {
      exception.value = redactText(exception.value);
    }
  });
};

// Stable, non-sensitive facts about the failure that the scrubbed message no
// longer carries.
const errorTags = (error: unknown): Record<string, string> => {
  const tags: Record<string, string> = {};

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

export const scrubEvent = (event: ErrorEvent, hint: EventHint): ErrorEvent => {
  scrubRequest(event);
  scrubTraceContext(event);
  if (event.message !== undefined) {
    event.message = redactText(event.message);
  }

  const tags = errorTags(hint.originalException);
  if (Object.keys(tags).length > 0) {
    event.tags = { ...event.tags, ...tags };
  }

  sanitizeExceptions(event);
  return event;
};

// -- Span scrubbing --

export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  const { attributes } = span;
  const isOutbound = attributes["sentry.op"] === "http.client";
  const { "url.full": url } = attributes;
  const keepPath = !isOutbound || (typeof url === "string" && isApiUrl(url));

  scrubUrlData(attributes, keepPath);

  if (isOutbound) {
    // "GET https://host/path" keeps the sanitized path for our own API and
    // only the host otherwise. A bare path has no known host, so it is dropped.
    const separator = span.name.indexOf(" ");
    if (separator !== -1) {
      const method = span.name.slice(0, separator);
      const target = span.name.slice(separator + 1);
      if (target.includes("://")) {
        span.name = `${method} ${scrubUrl(target, isApiUrl(target))}`;
      } else if (target.startsWith("/")) {
        span.name = method;
      }
    }
  }

  return span;
};

// -- ApplicationError tagging: keeps distinct outcomes from the same call
// site as separate Sentry issues --

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

export const applicationErrorTagsIntegration = (): Integration => ({
  name: "ApplicationErrorTags",
  preprocessEvent: (event, hint) => {
    if (event.exception !== undefined) {
      tagApplicationError(event as ErrorEvent, hint ?? {});
    }
  },
});

// -- Sentry configuration --

export const sentryConfig: NodeOptions = {
  dsn: config.SENTRY_DSN,
  // Logs are already written to stdout as JSON; do not duplicate them in Sentry.
  beforeSendLog: () => null,
  // The console integration is removed so log output (which carries LAA
  // references) does not become breadcrumbs. Http breadcrumbs are disabled
  // outright rather than scrubbed. The default express integration is replaced
  // so that errors with a 4xx status are reported too.
  integrations: (defaults) => [
    ...defaults.filter(
      ({ name }) => !["Console", "Express", "Http"].includes(name),
    ),
    Sentry.httpIntegration({ breadcrumbs: false }),
    Sentry.expressIntegration({ shouldHandleError: () => true }),
    applicationErrorTagsIntegration(),
    nodeProfilingIntegration(),
  ],
  beforeSend: scrubEvent,
  beforeSendSpan: scrubSpan,
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
