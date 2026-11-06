import { strict as assert } from "assert";
import { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  buildInquestsApiHeaders,
  getInquestsApi,
  translateInquestsApiError,
} from "#src/adaptors/source/inquests-api/utils.js";
import { runWithLoggingContext } from "#src/infrastructure/logging/logger.js";
import sinon from "sinon";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const buildAxiosError = (status: number): AxiosError => {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };

  return new AxiosError(
    "Request failed",
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    {
      status,
      statusText: "",
      data: {},
      headers: new AxiosHeaders(),
      config,
    } as AxiosResponse,
  );
};

describe("buildInquestsApiHeaders", () => {
  it("forwards the active correlation ID to the Inquests API", () => {
    const headers = runWithLoggingContext(
      { requestId: "req-123", correlationId: "cor-456" },
      () => buildInquestsApiHeaders("access-token-123"),
    );

    assert.equal(headers.Authorization, "Bearer access-token-123");
    assert.equal(headers["x-correlation-id"], "cor-456");
    assert.equal(headers["x-request-id"], undefined);
  });

  it("omits the correlation header when there is no active request context", () => {
    const headers = buildInquestsApiHeaders("access-token-123");

    assert.deepEqual(headers, { Authorization: "Bearer access-token-123" });
  });

  it("sends the correlation header from shared request helpers", async () => {
    const get = sinon.stub().resolves({ data: {} });

    await runWithLoggingContext(
      { requestId: "req-123", correlationId: "cor-456" },
      async () =>
        await getInquestsApi({
          http: { get } as never,
          baseUrl: "https://localhost",
          path: "/applications",
          accessToken: "access-token-123",
        }),
    );

    const [, options] = get.firstCall.args as [
      string,
      { headers: Record<string, string> },
    ];
    assert.equal(options.headers["x-correlation-id"], "cor-456");
  });
});

describe("translateInquestsApiError", () => {
  it("classifies authentication and authorization failures", () => {
    assert.equal(
      translateInquestsApiError(buildAxiosError(401), "get_application").type,
      APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    );
    assert.equal(
      translateInquestsApiError(buildAxiosError(403), "get_application").type,
      APPLICATION_ERROR_TYPES.FORBIDDEN,
    );
  });

  it("classifies upstream availability and rejection failures", () => {
    assert.equal(
      translateInquestsApiError(buildAxiosError(500), "get_application").type,
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
    );
    assert.equal(
      translateInquestsApiError(buildAxiosError(404), "get_application").type,
      APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
    );
  });

  it("sanitizes non-Axios failures", () => {
    const result = translateInquestsApiError(
      new Error("network"),
      "get_application",
    );

    assert.ok(result instanceof ApplicationError);
    assert.equal(result.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
  });

  it("preserves an existing application error", () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.FORBIDDEN,
      "get_application",
      false,
    );

    assert.equal(translateInquestsApiError(error, "get_application"), error);
  });
});
