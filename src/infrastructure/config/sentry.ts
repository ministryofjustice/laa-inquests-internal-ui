import * as Sentry from "@sentry/node";
import type { NodeOptions } from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import config from "#src/infrastructure/config/config.js";
import {
  applicationErrorTagsIntegration,
  scrubEvent,
  scrubSpan,
} from "#src/infrastructure/config/sentryHelpers.js";

const TRACES_SAMPLE_RATE = 0.02;
const PROFILE_SESSION_SAMPLE_RATE = 0.2;
const NO_FRAME_CONTEXT_LINES = 0;

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
