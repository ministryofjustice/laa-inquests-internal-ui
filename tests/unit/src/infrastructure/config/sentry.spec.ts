import { expect } from "chai";
import * as Sentry from "@sentry/node";
import type { Breadcrumb, ErrorEvent, Log } from "@sentry/node";
import { AxiosError } from "axios";
import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { z } from "zod";
import config from "#src/infrastructure/config/config.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";
import {
  initSentry,
  scrubBreadcrumb,
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
    expect(names).to.include("Http");
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
  [
    "AxiosError",
    "ZodError",
    "$ZodError",
    "AuthError",
    "ClientAuthError",
    "ClientConfigurationError",
    "InteractionRequiredAuthError",
    "ServerError",
  ].forEach((type) => {
    it(`filters the message of ${type} exceptions`, () => {
      const event = scrubEvent(
        exceptionEvent(type, "failed for LAA-SECRET"),
        HINT,
      );

      expect(event?.exception?.values?.[0]?.value).to.equal("[Filtered]");
    });
  });

  it("keeps the type of filtered exceptions", () => {
    const event = scrubEvent(exceptionEvent("AxiosError", "secret"), HINT);

    expect(event?.exception?.values?.[0]?.type).to.equal("AxiosError");
  });

  it("keeps the message of application errors", () => {
    const event = scrubEvent(
      exceptionEvent(
        "ApplicationError",
        "Application operation failed: get_application",
      ),
      HINT,
    );

    expect(event?.exception?.values?.[0]?.value).to.equal(
      "Application operation failed: get_application",
    );
  });

  it("keeps the message of other exceptions", () => {
    const event = scrubEvent(
      exceptionEvent("TypeError", "x is undefined"),
      HINT,
    );

    expect(event?.exception?.values?.[0]?.value).to.equal("x is undefined");
  });

  it("reduces the request url to scheme and host", () => {
    const event = scrubEvent(
      toErrorEvent({
        request: {
          url: "https://user:pass@internal.example.com/applications/LAA-SECRET?token=abc#frag",
          method: "GET",
        },
      }),
      HINT,
    );

    expect(event?.request?.url).to.equal("https://internal.example.com");
    expect(event?.request?.method).to.equal("GET");
  });

  it("removes the request query string, cookies, headers and body", () => {
    const event = scrubEvent(
      toErrorEvent({
        request: {
          url: "https://internal.example.com/",
          query_string: "token=abc",
          cookies: { session: "secret" },
          headers: { authorization: "Bearer secret" },
          data: "name=secret",
        },
      }),
      HINT,
    );

    expect(event?.request).to.not.have.any.keys(
      "query_string",
      "cookies",
      "headers",
      "data",
    );
  });

  it("removes user and extra data", () => {
    const event = scrubEvent(
      toErrorEvent({
        user: { ip_address: "203.0.113.1", email: "a@example.com" },
        extra: { laa_reference: "LAA-SECRET" },
      }),
      HINT,
    );

    expect(event).to.not.have.any.keys("user", "extra");
  });

  it("replaces the raw path in the transaction name with the route template", () => {
    const event = scrubEvent(
      toErrorEvent({
        transaction: "GET /applications/LAA-SECRET",
        request: {
          url: "https://internal.example.com/applications/LAA-SECRET",
        },
        contexts: {
          trace: { data: { "http.route": "/applications/:laaReference" } },
        },
      }),
      HINT,
    );

    expect(event?.transaction).to.equal("GET /applications/:laaReference");
  });

  it("filters the raw path in the transaction name when the route is unknown", () => {
    const event = scrubEvent(
      toErrorEvent({
        transaction: "GET /applications/LAA-SECRET",
        request: {
          url: "https://internal.example.com/applications/LAA-SECRET",
        },
      }),
      HINT,
    );

    expect(event?.transaction).to.equal("GET [Filtered]");
  });

  it("keeps a transaction name that is already a route template", () => {
    const event = scrubEvent(
      toErrorEvent({
        transaction: "GET /applications/:laaReference",
        request: {
          url: "https://internal.example.com/applications/LAA-SECRET",
        },
      }),
      HINT,
    );

    expect(event?.transaction).to.equal("GET /applications/:laaReference");
  });

  it("removes the url from the trace context data", () => {
    const event = scrubEvent(
      toErrorEvent({
        contexts: {
          trace: {
            data: {
              "url.path": "/applications/LAA-SECRET",
              "url.full":
                "https://internal.example.com/applications/LAA-SECRET",
              "http.route": "/applications/:laaReference",
            },
          },
        },
      }),
      HINT,
    );

    expect(event?.contexts?.trace?.data).to.deep.equal({
      "http.route": "/applications/:laaReference",
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

describe("scrubBreadcrumb", () => {
  it("reduces outbound http breadcrumb urls to scheme and host", () => {
    const breadcrumb = scrubBreadcrumb(
      {
        category: "http",
        data: {
          url: "https://api.example.com/applications/LAA-SECRET?token=abc",
          method: "GET",
        },
      } as Breadcrumb,
      HINT,
    );

    expect(breadcrumb?.data?.url).to.equal("https://api.example.com");
    expect(breadcrumb?.data?.method).to.equal("GET");
  });

  it("removes query and fragment data from breadcrumbs", () => {
    const breadcrumb = scrubBreadcrumb(
      {
        category: "http",
        data: { "http.query": "token=abc", "http.fragment": "frag" },
      } as Breadcrumb,
      HINT,
    );

    expect(breadcrumb?.data).to.deep.equal({});
  });

  it("returns breadcrumbs without data unchanged", () => {
    const breadcrumb = scrubBreadcrumb({ category: "navigation" }, HINT);

    expect(breadcrumb).to.deep.equal({ category: "navigation" });
  });
});

describe("scrubSpan", () => {
  it("reduces outbound http span urls to scheme and host", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET",
        attributes: {
          "sentry.op": "http.client",
          "url.full":
            "https://api.example.com/applications/LAA-SECRET?token=abc",
          "url.path": "/applications/LAA-SECRET",
          "url.query": "?token=abc",
          "http.target": "/applications/LAA-SECRET?token=abc",
          "http.request.method": "GET",
        },
      }),
    );

    expect(span.attributes).to.deep.equal({
      "sentry.op": "http.client",
      "url.full": "https://api.example.com",
      "http.request.method": "GET",
    });
  });

  it("reduces an outbound http span name containing a url to scheme and host", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET https://api.example.com/applications/LAA-SECRET",
        attributes: { "sentry.op": "http.client" },
      }),
    );

    expect(span.name).to.equal("GET https://api.example.com");
  });

  it("drops the path from an outbound http span name", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET /applications/LAA-SECRET",
        attributes: { "sentry.op": "http.client" },
      }),
    );

    expect(span.name).to.equal("GET");
  });

  it("keeps the host in an outbound http span name", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET 127.0.0.1",
        attributes: { "sentry.op": "http.client" },
      }),
    );

    expect(span.name).to.equal("GET 127.0.0.1");
  });

  it("removes the raw url from incoming request spans and keeps the route", () => {
    const span = scrubSpan(
      toSpan({
        attributes: {
          "sentry.op": "http.server",
          "url.full": "https://internal.example.com/applications/LAA-SECRET",
          "url.path": "/applications/LAA-SECRET",
          "url.query": "?token=abc",
          "http.target": "/applications/LAA-SECRET?token=abc",
          "http.route": "/applications/:laaReference",
        },
      }),
    );

    expect(span.attributes).to.deep.equal({
      "sentry.op": "http.server",
      "http.route": "/applications/:laaReference",
    });
  });

  it("replaces the raw path in span names with the route template", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET /applications/LAA-SECRET",
        attributes: {
          "sentry.op": "http.server",
          "url.path": "/applications/LAA-SECRET",
          "http.route": "/applications/:laaReference",
          "sentry.segment.name": "GET /applications/LAA-SECRET",
        },
      }),
    );

    expect(span.name).to.equal("GET /applications/:laaReference");
    expect(span.attributes["sentry.segment.name"]).to.equal(
      "GET /applications/:laaReference",
    );
  });

  it("filters the raw path in span names when the route is unknown", () => {
    const span = scrubSpan(
      toSpan({
        name: "GET /applications/LAA-SECRET",
        attributes: {
          "sentry.op": "http.server",
          "url.path": "/applications/LAA-SECRET",
        },
      }),
    );

    expect(span.name).to.equal("GET [Filtered]");
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

  it("does not leak the url, query, cookies or headers of the failing request", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app)
      .get("/applications/LAA-SECRET?token=abc")
      .set("Cookie", "session=cookie-secret")
      .set("Authorization", "Bearer bearer-secret")
      .expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.not.include("LAA-SECRET");
    expect(serialised).to.not.include("token=abc");
    expect(serialised).to.not.include("cookie-secret");
    expect(serialised).to.not.include("bearer-secret");
  });

  it("filters the message of axios errors", async () => {
    const app = buildApp(
      () => new AxiosError("Request failed: /applications/LAA-SECRET"),
    );

    await request(app).get("/applications/x").expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.include("AxiosError");
    expect(serialised).to.not.include("LAA-SECRET");
  });

  it("filters the message of zod validation errors", async () => {
    const app = buildApp(() => {
      const result = z
        .object({ name: z.string() })
        .safeParse({ name: 42, secret: "LAA-SECRET" });
      return result.error;
    });

    await request(app).get("/applications/x").expect(500);
    await Sentry.flush(2000);

    const [event] = events("event") as unknown as ErrorEvent[];
    expect(event?.exception?.values?.[0]?.value).to.equal("[Filtered]");
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

  it("keeps only the host of outbound requests in breadcrumbs and spans", async () => {
    await Sentry.startSpan({ name: "outbound" }, async () => {
      await new Promise<void>((resolve, reject) => {
        http
          .get(`${localServerUrl}/applications/LAA-SECRET?token=abc`, (res) => {
            res.resume();
            res.on("end", resolve);
          })
          .on("error", reject);
      });
    });
    Sentry.captureException(new Error("after outbound call"));
    await Sentry.flush(2000);

    const serialised = JSON.stringify(items.map((item) => item.payload));
    expect(serialised).to.include(localServerUrl);
    expect(serialised).to.not.include("LAA-SECRET");
    expect(serialised).to.not.include("token=abc");
  });
});
