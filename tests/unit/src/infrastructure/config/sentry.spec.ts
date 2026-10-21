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
import { initSentry, sentryConfig } from "#src/infrastructure/config/sentry.js";

const TEST_DSN = "https://key@o0.ingest.sentry.io/1";

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

  it("registers the application error tags integration before event processors", () => {
    const integrations = sentryConfig.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];

    expect(integrations([]).map(({ name }) => name)).to.include(
      "ApplicationErrorTags",
    );
  });
});

describe("express error reporting", () => {
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

  it("sends the full path verbatim, even for unexpected values", async () => {
    const app = buildApp(() => new Error("boom"));

    await request(app).get("/applications/jane-smith-evidence.pdf").expect(500);
    await Sentry.flush(2000);

    const serialised = JSON.stringify(events("event"));
    expect(serialised).to.include("jane-smith-evidence.pdf");
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
      // The local server only exists to give outbound calls somewhere to hit;
      // it is not one of our own routes, so its own incoming-request span
      // (created because the Http integration instruments the whole process)
      // must not be treated as one.
      items = [];
      Sentry.init({
        ...sentryConfig,
        dsn: TEST_DSN,
        tracesSampleRate: 1,
        profileSessionSampleRate: 0,
        integrations: (defaults) => {
          const base = (
            sentryConfig.integrations as (
              d: typeof defaults,
            ) => { name: string }[]
          )(defaults);
          return base.map((integration) =>
            integration.name === "Http"
              ? Sentry.httpIntegration({
                  breadcrumbs: false,
                  ignoreIncomingRequests: () => true,
                })
              : integration,
          );
        },
        transport: () => ({
          send: async (envelope) => {
            const [, envelopeItems] = envelope;
            for (const [header, payload] of envelopeItems) {
              const { type } = header as { type: string };
              items.push({
                type,
                payload: payload as Record<string, unknown>,
              });
            }
            return {};
          },
          flush: async () => true,
        }),
      });
    });

    afterEach(() => {
      config.INQUESTS_API_URL = originalApiUrl;
    });

    it("keeps the path of requests to our own API but not the query", async () => {
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
