import { expect } from "chai";
import * as Sentry from "@sentry/node";
import type { ErrorEvent, Log } from "@sentry/node";
import { AxiosError } from "axios";
import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import config from "#src/infrastructure/config/config.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";
import {
  initSentry,
  scrubEvent,
  scrubSpan,
  sentryConfig,
  shouldHandleExpressError,
  tagApplicationError,
} from "#src/infrastructure/config/sentry.js";

const TEST_DSN = "https://key@o0.ingest.sentry.io/1";
const HINT = {};

type Span = Parameters<typeof scrubSpan>[0];

const toSpan = (span: Record<string, unknown>): Span =>
  ({ name: "GET", attributes: {}, ...span }) as unknown as Span;

const toErrorEvent = (event: Record<string, unknown>): ErrorEvent =>
  event as unknown as ErrorEvent;

const exceptionEvent = (type: string, value: string): ErrorEvent =>
  toErrorEvent({ exception: { values: [{ type, value }] } });

const API_URL = "https://api.example.com";

// Outbound urls keep their path only for our own Inquests API host.
const useApiUrl = (): void => {
  let original: string;
  before(() => {
    original = config.INQUESTS_API_URL;
    config.INQUESTS_API_URL = API_URL;
  });
  after(() => {
    config.INQUESTS_API_URL = original;
  });
};

describe("sentryConfig", () => {
  it("uses the ENVIRONMENT config value as the Sentry environment", () => {
    expect(sentryConfig.environment).to.equal(config.ENVIRONMENT);
  });

  it("uses the SENTRY_DSN config value as the DSN", () => {
    expect(sentryConfig.dsn).to.equal(config.SENTRY_DSN);
  });

  it("drops all logs", () => {
    expect(sentryConfig.beforeSendLog?.({} as Log)).to.equal(null);
  });

  it("samples 2% of traces", () => {
    expect(sentryConfig.tracesSampleRate).to.equal(0.02);
  });

  it("profiles 20% of sessions for the lifetime of a trace", () => {
    expect(sentryConfig.profileSessionSampleRate).to.equal(0.2);
    expect(sentryConfig.profileLifecycle).to.equal("trace");
  });

  it("does not use the deprecated sendDefaultPii option", () => {
    expect(sentryConfig).to.not.have.property("sendDefaultPii");
  });

  it("disables user info collection", () => {
    expect(sentryConfig.dataCollection?.userInfo).to.equal(false);
  });

  it("disables cookie collection", () => {
    expect(sentryConfig.dataCollection?.cookies).to.equal(false);
  });

  it("disables request and response header collection", () => {
    expect(sentryConfig.dataCollection?.httpHeaders).to.deep.equal({
      request: false,
      response: false,
    });
  });

  it("disables http body collection", () => {
    expect(sentryConfig.dataCollection?.httpBodies).to.deep.equal([]);
  });

  it("disables url query param collection", () => {
    expect(sentryConfig.dataCollection?.urlQueryParams).to.equal(false);
  });

  it("disables queue, database query and gen AI/GraphQL collection", () => {
    expect(sentryConfig.dataCollection?.queues).to.equal(false);
    expect(sentryConfig.dataCollection?.databaseQueryData).to.equal(false);
    expect(sentryConfig.dataCollection?.genAI).to.deep.equal({
      inputs: false,
      outputs: false,
    });
    expect(sentryConfig.dataCollection?.graphQL).to.deep.equal({
      document: false,
      variables: false,
    });
  });

  it("disables stack frame variables and source context lines", () => {
    expect(sentryConfig.dataCollection?.stackFrameVariables).to.equal(false);
    expect(sentryConfig.dataCollection?.frameContextLines).to.equal(0);
  });

  it("includes the node profiling integration", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    expect(integrations([]).map(({ name }) => name)).to.include(
      "ProfilingIntegration",
    );
  });

  it("removes the console integration so log output does not become breadcrumbs", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    const names = integrations([{ name: "Console" }, { name: "Http" }]).map(
      ({ name }) => name,
    );

    expect(names).to.not.include("Console");
  });

  it("replaces the default http integration with one that disables breadcrumbs", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    const names = integrations([{ name: "Http" }]).map(({ name }) => name);

    expect(names.filter((name) => name === "Http")).to.have.length(1);
  });
});

describe("express error reporting", () => {
  [undefined, 400, 401, 403, 404, 500].forEach((status) => {
    it(`reports errors with status ${String(status)}`, () => {
      const error = Object.assign(new Error("failed"), { status });

      expect(shouldHandleExpressError(error)).to.equal(true);
    });
  });

  it("replaces the default express integration with one that reports every error", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    const names = integrations([{ name: "Express" }, { name: "Http" }]).map(
      ({ name }) => name,
    );

    expect(names.filter((name) => name === "Express")).to.have.length(1);
  });
});

describe("initSentry", () => {
  afterEach(async () => {
    await Sentry.close(2000);
  });

  it("does not initialise Sentry when there is no DSN", () => {
    const initialised = initSentry({ ...sentryConfig, dsn: "" });

    expect(initialised).to.equal(false);
    expect(Sentry.getClient()).to.equal(undefined);
  });

  it("initialises Sentry when a DSN is set", () => {
    const initialised = initSentry({
      ...sentryConfig,
      dsn: TEST_DSN,
      profileSessionSampleRate: 0,
    });

    expect(initialised).to.equal(true);
    expect(Sentry.getClient()).to.not.equal(undefined);
  });
});

describe("scrubEvent", () => {
  describe("exception messages", () => {
    it("keeps the status text of axios errors", () => {
      const event = scrubEvent(
        exceptionEvent("AxiosError", "Request failed with status code 403"),
        HINT,
      );

      expect(event.exception?.values?.[0]?.value).to.equal(
        "Request failed with status code 403",
      );
    });

    it("redacts addresses and emails in axios error messages", () => {
      const event = scrubEvent(
        exceptionEvent(
          "AxiosError",
          "connect ECONNREFUSED 10.1.2.3:443 for jane@example.com",
        ),
        HINT,
      );

      expect(event.exception?.values?.[0]?.value).to.equal(
        "connect ECONNREFUSED [IP]:443 for [Email]",
      );
    });

    it("tags axios errors with their status and code", () => {
      const error = Object.assign(new Error("timeout of 5000ms exceeded"), {
        isAxiosError: true,
        code: "ECONNABORTED",
        status: 504,
      });

      const event = scrubEvent(exceptionEvent("AxiosError", "timeout"), {
        originalException: error,
      });

      expect(event.tags).to.deep.equal({
        axios_code: "ECONNABORTED",
        http_status: "504",
      });
    });

    it("keeps the message of application errors", () => {
      const event = scrubEvent(
        exceptionEvent(
          "ApplicationError",
          "Application operation failed: get_application",
        ),
        HINT,
      );

      expect(event.exception?.values?.[0]?.value).to.equal(
        "Application operation failed: get_application",
      );
    });

    it("keeps the message of other exceptions", () => {
      const event = scrubEvent(
        exceptionEvent("TypeError", "x is undefined"),
        HINT,
      );

      expect(event.exception?.values?.[0]?.value).to.equal("x is undefined");
    });

    it("redacts addresses, emails and tokens in other exceptions", () => {
      const event = scrubEvent(
        exceptionEvent(
          "Error",
          "connect ECONNREFUSED 10.1.2.3:6379 as jane@example.com Bearer abc.def",
        ),
        HINT,
      );

      expect(event.exception?.values?.[0]?.value).to.equal(
        "connect ECONNREFUSED [IP]:6379 as [Email] Bearer [Token]",
      );
    });
  });

  describe("event message", () => {
    it("redacts emails and addresses in the event message", () => {
      const event = scrubEvent(
        toErrorEvent({ message: "lookup for jane@example.com via 10.1.2.3" }),
        HINT,
      );

      expect(event.message).to.equal("lookup for [Email] via [IP]");
    });

    it("leaves an event without a message alone", () => {
      const event = scrubEvent(toErrorEvent({}), HINT);

      expect(event).to.not.have.property("message");
    });
  });

  describe("request", () => {
    it("keeps the path with its case and claim references", () => {
      const event = scrubEvent(
        toErrorEvent({
          request: {
            url: "https://internal.example.com/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected",
            method: "GET",
          },
        }),
        HINT,
      );

      expect(event.request?.url).to.equal(
        "https://internal.example.com/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected",
      );
      expect(event.request?.method).to.equal("GET");
    });

    it("drops credentials, the query string and the fragment from the url", () => {
      const event = scrubEvent(
        toErrorEvent({
          request: {
            url: "https://jane:pw@internal.example.com/auth/callback?code=abc&state=xyz#frag",
          },
        }),
        HINT,
      );

      expect(event.request?.url).to.equal(
        "https://internal.example.com/auth/callback",
      );
    });

    it("replaces path segments that are not route words or references", () => {
      const event = scrubEvent(
        toErrorEvent({
          request: {
            url: "https://internal.example.com/applications/jane-smith/report-jane-smith.pdf",
          },
        }),
        HINT,
      );

      expect(event.request?.url).to.equal(
        "https://internal.example.com/applications/[Filtered]/[Filtered]",
      );
    });

    it("tags the event with the references in the request path", () => {
      const event = scrubEvent(
        toErrorEvent({
          tags: { existing: "kept" },
          request: {
            url: "https://internal.example.com/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected",
          },
        }),
        HINT,
      );

      expect(event.tags).to.deep.equal({
        existing: "kept",
        laa_reference: "INQ-ABC-123",
        claim_reference: "INQC-AB12-CD34",
      });
    });

    it("does not tag segments that only look like a reference", () => {
      const event = scrubEvent(
        toErrorEvent({
          request: {
            url: "https://internal.example.com/applications/INQ-ABC-123-jane/overview",
          },
        }),
        HINT,
      );

      expect(event).to.not.have.property("tags");
    });
  });

  describe("transaction name", () => {
    it("keeps a transaction name that is already a route template", () => {
      const event = scrubEvent(
        toErrorEvent({
          transaction: "GET /applications/:laaReference",
          request: {
            url: "https://internal.example.com/applications/INQ-ABC-123",
          },
        }),
        HINT,
      );

      expect(event.transaction).to.equal("GET /applications/:laaReference");
    });

    it("falls back to the sanitized path when the route is unknown", () => {
      const event = scrubEvent(
        toErrorEvent({
          transaction: "POST /applications/INQ-ABC-123/note",
          request: {
            url: "https://internal.example.com/applications/INQ-ABC-123/note",
          },
        }),
        HINT,
      );

      expect(event.transaction).to.equal("POST /applications/INQ-ABC-123/note");
    });

    it("filters unknown segments in the fallback path", () => {
      const event = scrubEvent(
        toErrorEvent({
          transaction: "GET /applications/jane-smith",
          request: {
            url: "https://internal.example.com/applications/jane-smith",
          },
        }),
        HINT,
      );

      expect(event.transaction).to.equal("GET /applications/[Filtered]");
    });
  });

  describe("trace context data", () => {
    it("keeps the sanitized path", () => {
      const event = scrubEvent(
        toErrorEvent({
          contexts: {
            trace: {
              data: {
                "url.path": "/applications/INQ-ABC-123/report-jane.pdf",
                "url.full":
                  "https://internal.example.com/applications/INQ-ABC-123/overview?code=abc",
                "http.route": "/applications/:laaReference",
              },
            },
          },
        }),
        HINT,
      );

      expect(event.contexts?.trace?.data).to.deep.equal({
        "url.path": "/applications/INQ-ABC-123/[Filtered]",
        "url.full":
          "https://internal.example.com/applications/INQ-ABC-123/overview",
        "http.route": "/applications/:laaReference",
      });
    });
  });
});

describe("tagApplicationError", () => {
  it("tags application errors with their type, operation and retryability", () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.FORBIDDEN,
      "get_application",
      false,
    );
    const event = toErrorEvent({ tags: { existing: "kept" } });

    tagApplicationError(event, { originalException: error });

    expect(event.tags).to.deep.equal({
      existing: "kept",
      error_type: "FORBIDDEN",
      operation: "get_application",
      retryable: false,
    });
  });

  it("fingerprints application errors by type so different outcomes are separate issues", () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_application",
      true,
    );
    const event = toErrorEvent({});

    tagApplicationError(event, { originalException: error });

    expect(event.fingerprint).to.deep.equal([
      "{{ default }}",
      "UPSTREAM_UNAVAILABLE",
    ]);
  });

  it("tags application errors created by another copy of the class", () => {
    // instrument.js and app.js are separate bundles, so each has its own
    // ApplicationError class and instanceof cannot be used.
    class BundledCopyOfApplicationError extends Error {
      readonly type = "NOT_FOUND";
      readonly operation = "get_application";
      readonly retryable = false;
      constructor() {
        super("Application operation failed: get_application");
        this.name = "ApplicationError";
      }
    }
    const event = toErrorEvent({});

    tagApplicationError(event, {
      originalException: new BundledCopyOfApplicationError(),
    });

    expect(event.tags).to.deep.equal({
      error_type: "NOT_FOUND",
      operation: "get_application",
      retryable: false,
    });
    expect(event.fingerprint).to.deep.equal(["{{ default }}", "NOT_FOUND"]);
  });

  it("does not tag errors that only share the name", () => {
    const lookalike = Object.assign(new Error("x"), {
      name: "ApplicationError",
      type: 42,
    });
    const event = toErrorEvent({});

    tagApplicationError(event, { originalException: lookalike });

    expect(event).to.not.have.any.keys("tags", "fingerprint");
  });

  it("does not tag other errors", () => {
    const event = toErrorEvent({});

    tagApplicationError(event, { originalException: new Error("boom") });

    expect(event).to.not.have.any.keys("tags", "fingerprint");
  });

  it("is registered as an integration that runs before event processors", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    expect(integrations([]).map(({ name }) => name)).to.include(
      "ApplicationErrorTags",
    );
  });
});

describe("scrubSpan", () => {
  useApiUrl();

  describe("outbound requests", () => {
    it("keeps the sanitized path and the references of requests to our own API", () => {
      const span = scrubSpan(
        toSpan({
          attributes: {
            "sentry.op": "http.client",
            "url.full": `${API_URL}/applications/INQ-ABC-123/claims/INQC-AB12-CD34?token=abc`,
            "url.path": "/applications/INQ-ABC-123/claims/INQC-AB12-CD34",
            "http.request.method": "GET",
          },
        }),
      );

      expect(span.attributes).to.deep.equal({
        "sentry.op": "http.client",
        "url.full": `${API_URL}/applications/INQ-ABC-123/claims/INQC-AB12-CD34`,
        "url.path": "/applications/INQ-ABC-123/claims/INQC-AB12-CD34",
        "http.request.method": "GET",
        laa_reference: "INQ-ABC-123",
        claim_reference: "INQC-AB12-CD34",
      });
    });

    it("keeps only the host of requests to other services", () => {
      const span = scrubSpan(
        toSpan({
          attributes: {
            "sentry.op": "http.client",
            "url.full":
              "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
            "url.path": "/tenant-id/oauth2/v2.0/token",
            "http.request.method": "POST",
          },
        }),
      );

      expect(span.attributes).to.deep.equal({
        "sentry.op": "http.client",
        "url.full": "https://login.microsoftonline.com",
        "http.request.method": "POST",
      });
    });

    it("keeps the sanitized path in the name of requests to our own API", () => {
      const span = scrubSpan(
        toSpan({
          name: `GET ${API_URL}/applications/INQ-ABC-123/note?token=abc`,
          attributes: { "sentry.op": "http.client" },
        }),
      );

      expect(span.name).to.equal(
        `GET ${API_URL}/applications/INQ-ABC-123/note`,
      );
    });

    it("reduces the name of requests to other services to the host", () => {
      const span = scrubSpan(
        toSpan({
          name: "GET https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
          attributes: { "sentry.op": "http.client" },
        }),
      );

      expect(span.name).to.equal("GET https://login.microsoftonline.com");
    });

    it("keeps a host only span name", () => {
      const span = scrubSpan(
        toSpan({
          name: "GET 127.0.0.1",
          attributes: { "sentry.op": "http.client" },
        }),
      );

      expect(span.name).to.equal("GET 127.0.0.1");
    });
  });

  describe("incoming requests", () => {
    it("keeps the sanitized url and the references of the incoming request", () => {
      const span = scrubSpan(
        toSpan({
          attributes: {
            "sentry.op": "http.server",
            "url.full":
              "https://internal.example.com/applications/INQ-ABC-123/overview?code=abc",
            "url.path": "/applications/INQ-ABC-123/overview",
            "http.route": "/applications/:laaReference/overview",
          },
        }),
      );

      expect(span.attributes).to.deep.equal({
        "sentry.op": "http.server",
        "url.full":
          "https://internal.example.com/applications/INQ-ABC-123/overview",
        "url.path": "/applications/INQ-ABC-123/overview",
        "http.route": "/applications/:laaReference/overview",
        laa_reference: "INQ-ABC-123",
      });
    });

    it("filters unknown segments in the url", () => {
      const span = scrubSpan(
        toSpan({
          attributes: {
            "sentry.op": "http.server",
            "url.path": "/applications/jane-smith",
          },
        }),
      );

      expect(span.attributes["url.path"]).to.equal("/applications/[Filtered]");
    });

    it("falls back to the sanitized path in span names when the route is unknown", () => {
      const span = scrubSpan(
        toSpan({
          name: "POST /applications/INQ-ABC-123/note",
          attributes: {
            "sentry.op": "http.server",
            "url.path": "/applications/INQ-ABC-123/note",
          },
        }),
      );

      expect(span.name).to.equal("POST /applications/INQ-ABC-123/note");
    });

    it("filters unknown segments in the fallback span name", () => {
      const span = scrubSpan(
        toSpan({
          name: "GET /applications/jane-smith",
          attributes: {
            "sentry.op": "http.server",
            "url.path": "/applications/jane-smith",
          },
        }),
      );

      expect(span.name).to.equal("GET /applications/[Filtered]");
    });
  });

  it("leaves other spans unchanged", () => {
    const span = scrubSpan(
      toSpan({
        name: "jsonParser",
        attributes: { "sentry.op": "middleware.express" },
      }),
    );

    expect(span.name).to.equal("jsonParser");
    expect(span.attributes).to.deep.equal({
      "sentry.op": "middleware.express",
    });
  });
});

describe("Sentry events produced with the real config", () => {
  type CapturedItem = { type: string; payload: Record<string, unknown> };

  let items: CapturedItem[];
  let localServer: http.Server;
  let localServerUrl: string;

  const init = (): void => {
    items = [];
    Sentry.init({
      ...sentryConfig,
      dsn: TEST_DSN,
      tracesSampleRate: 1,
      profileSessionSampleRate: 0,
      transport: () => ({
        send: async (envelope) => {
          const [, envelopeItems] = envelope;
          for (const [header, payload] of envelopeItems) {
            const { type } = header as { type: string };
            items.push({ type, payload: payload as Record<string, unknown> });
          }
          return {};
        },
        flush: async () => true,
      }),
    });
  };

  const events = (type: string): Record<string, unknown>[] =>
    items.filter((item) => item.type === type).map((item) => item.payload);

  before(async () => {
    localServer = http.createServer((_, res) => {
      res.end("ok");
    });
    await new Promise<void>((resolve) =>
      localServer.listen(0, "127.0.0.1", resolve),
    );
    localServerUrl = `http://127.0.0.1:${(localServer.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise((resolve) => localServer.close(resolve));
  });

  beforeEach(() => {
    init();
  });

  afterEach(async () => {
    await Sentry.close(2000);
  });

  const buildApp = (
    routeError: (req: express.Request) => unknown,
  ): express.Express => {
    const app = express();
    app.get("/applications/:laaReference", (req, _res, next) => {
      next(routeError(req));
    });
    Sentry.setupExpressErrorHandler(app);
    app.use(
      (
        _err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).send("error");
      },
    );
    return app;
  };

  it("captures unexpected server errors", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app).get("/applications/LAA-SECRET").expect(500);
    await Sentry.flush(2000);

    expect(events("event")).to.have.length(1);
  });

  it("keeps the case reference and drops personal data of the failing request", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app)
      .get("/applications/INQ-ABC-123?email=jane@example.com&code=abc")
      .set("Cookie", "session=cookie-secret")
      .set("Authorization", "Bearer bearer-secret")
      .set("X-Forwarded-For", "203.0.113.7")
      .expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.include("INQ-ABC-123");
    expect(serialised).to.not.include("jane@example.com");
    expect(serialised).to.not.include("code=abc");
    expect(serialised).to.not.include("cookie-secret");
    expect(serialised).to.not.include("bearer-secret");
    expect(serialised).to.not.include("203.0.113.7");
  });

  it("tags the event with the case reference", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app).get("/applications/INQ-ABC-123").expect(500);
    await Sentry.flush(2000);

    const [event] = events("event") as unknown as ErrorEvent[];
    expect(event?.tags?.laa_reference).to.equal("INQ-ABC-123");
  });

  it("does not send a name or file name that is part of the path", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app).get("/applications/jane-smith-evidence.pdf").expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.not.include("jane-smith");
    expect(serialised).to.not.include("evidence.pdf");
  });

  it("keeps the status text of axios errors and redacts addresses", async () => {
    const app = buildApp(
      () => new AxiosError("connect ECONNREFUSED 10.1.2.3:443"),
    );

    await request(app).get("/applications/INQ-ABC-123").expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.include("ECONNREFUSED [IP]:443");
    expect(serialised).to.not.include("10.1.2.3");
  });

  it("reports application errors of different types separately even though Dedupe is on", async () => {
    // Created at a single call site, so the errors have identical messages and stacks.
    let type: ApplicationErrorType = APPLICATION_ERROR_TYPES.FORBIDDEN;
    const app = buildApp(
      () => new ApplicationError(type, "get_application", false),
    );

    for (type of [
      APPLICATION_ERROR_TYPES.FORBIDDEN,
      APPLICATION_ERROR_TYPES.NOT_FOUND,
    ]) {
      await request(app).get("/applications/x").expect(500);
    }
    await Sentry.flush(2000);

    const tags = (events("event") as unknown as ErrorEvent[]).map(
      (event) => event.tags?.error_type,
    );
    expect(tags).to.deep.equal(["FORBIDDEN", "NOT_FOUND"]);
  });

  it("still collapses back to back repeats of the same application error", async () => {
    const app = buildApp(
      () =>
        new ApplicationError(
          APPLICATION_ERROR_TYPES.FORBIDDEN,
          "get_application",
          false,
        ),
    );

    await request(app).get("/applications/x").expect(500);
    await request(app).get("/applications/x").expect(500);
    await Sentry.flush(2000);

    expect(events("event")).to.have.length(1);
  });

  it("does not turn console output into breadcrumbs", async () => {
    console.info("LAA-SECRET printed by the logger");
    const app = buildApp(() => new Error("boom"));

    await request(app).get("/applications/x").expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.not.include("printed by the logger");
  });

  const callLocalServer = async (path: string): Promise<void> => {
    await Sentry.startSpan({ name: "outbound" }, async () => {
      await new Promise<void>((resolve, reject) => {
        http
          .get(`${localServerUrl}${path}`, (res) => {
            res.resume();
            res.on("end", resolve);
          })
          .on("error", reject);
      });
    });
    Sentry.captureException(new Error("after outbound call"));
    await Sentry.flush(2000);
  };

  describe("outbound requests", () => {
    let originalApiUrl: string;

    beforeEach(() => {
      originalApiUrl = config.INQUESTS_API_URL;
    });

    afterEach(() => {
      config.INQUESTS_API_URL = originalApiUrl;
    });

    it("keeps the path and references of requests to our own API but not the query", async () => {
      config.INQUESTS_API_URL = localServerUrl;

      await callLocalServer(
        "/applications/INQ-ABC-123/note?email=jane@example.com",
      );

      const serialised = JSON.stringify(items.map((item) => item.payload));
      expect(serialised).to.include(
        `${localServerUrl}/applications/INQ-ABC-123/note`,
      );
      expect(serialised).to.not.include("jane@example.com");
    });

    it("keeps only the host of requests to other services", async () => {
      config.INQUESTS_API_URL = "https://api.example.com";

      await callLocalServer("/tenant-id/oauth2/token?code=abc");

      const serialised = JSON.stringify(items.map((item) => item.payload));
      expect(serialised).to.include(localServerUrl);
      expect(serialised).to.not.include("tenant-id");
      expect(serialised).to.not.include("code=abc");
    });
  });
});
