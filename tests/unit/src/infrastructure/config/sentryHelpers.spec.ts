import { expect } from "chai";
import type { ErrorEvent } from "@sentry/node";
import config from "#src/infrastructure/config/config.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import {
  redactText,
  scrubEvent,
  scrubSpan,
  tagApplicationError,
} from "#src/infrastructure/config/sentryHelpers.js";

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

describe("redactText", () => {
  it("redacts email addresses", () => {
    expect(redactText("failed for jane.smith+test@example.co.uk now")).to.equal(
      "failed for [Email] now",
    );
  });

  it("redacts bearer tokens", () => {
    expect(redactText("Authorization: Bearer abc.def-123_xyz==")).to.equal(
      "Authorization: Bearer [Token]",
    );
  });

  it("redacts basic authorization credentials", () => {
    expect(redactText("Authorization: Basic dXNlcjpwYXNz")).to.equal(
      "Authorization: Basic [Token]",
    );
  });

  it("redacts json web tokens", () => {
    expect(
      redactText("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl end"),
    ).to.equal("token [Token] end");
  });

  it("redacts IPv4 addresses and keeps the port", () => {
    expect(redactText("connect ECONNREFUSED 10.1.2.3:6379")).to.equal(
      "connect ECONNREFUSED [IP]:6379",
    );
  });

  it("redacts full and compressed IPv6 addresses", () => {
    expect(
      redactText(
        "from 2001:0db8:85a3:0000:0000:8a2e:0370:7334 and ::1 and fe80::1",
      ),
    ).to.equal("from [IP] and [IP] and [IP]");
  });

  it("redacts secrets passed as key value pairs", () => {
    expect(
      redactText("client_secret=s3cr3t&password: hunter2 refresh_token=abc"),
    ).to.equal(
      "client_secret=[Redacted]&password=[Redacted] refresh_token=[Redacted]",
    );
  });

  it("keeps references, times, versions and plain messages", () => {
    const message =
      "INQ-ABC-123 and INQC-AB12-CD34 at 10:15:30 on v1.2.3 failed with status code 500";

    expect(redactText(message)).to.equal(message);
  });

  it("redacts every occurrence", () => {
    expect(redactText("a@b.com then c@d.com")).to.equal("[Email] then [Email]");
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
  });

  describe("trace context data", () => {
    it("keeps the path and drops the query string", () => {
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
        "url.path": "/applications/INQ-ABC-123/report-jane.pdf",
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
    // sentryInit.js and app.js are separate bundles, so each has its own
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
});

describe("scrubSpan", () => {
  useApiUrl();

  describe("outbound requests", () => {
    it("keeps the sanitized path of requests to our own API", () => {
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
    it("keeps the sanitized url of the incoming request", () => {
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
      });
    });

    it("keeps url path segments that are not route words or references", () => {
      const span = scrubSpan(
        toSpan({
          attributes: {
            "sentry.op": "http.server",
            "url.path": "/applications/jane-smith",
          },
        }),
      );

      expect(span.attributes["url.path"]).to.equal("/applications/jane-smith");
    });

    it("leaves the span name untouched for incoming requests", () => {
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
