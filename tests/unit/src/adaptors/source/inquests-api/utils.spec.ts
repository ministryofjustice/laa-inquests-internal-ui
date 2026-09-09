import { strict as assert } from "assert";
import { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toUpstreamAuthError } from "#src/adaptors/source/inquests-api/utils.js";
import {
  UPSTREAM_AUTH_FAILURES,
  UpstreamAuthError,
} from "#src/ports/common/upstreamAuthError.js";

const ROUTE = "/applications/INQ-YYY-001";
const METHOD = "GET";

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

describe("toUpstreamAuthError", () => {
  it("translates a 401 into an unauthenticated failure", () => {
    const result = toUpstreamAuthError(buildAxiosError(401), ROUTE, METHOD);

    assert.ok(result instanceof UpstreamAuthError);
    assert.equal(result.failure, UPSTREAM_AUTH_FAILURES.UNAUTHENTICATED);
    assert.equal(result.route, ROUTE);
    assert.equal(result.method, METHOD);
  });

  it("translates a 403 into a forbidden failure", () => {
    const result = toUpstreamAuthError(buildAxiosError(403), ROUTE, METHOD);

    assert.ok(result instanceof UpstreamAuthError);
    assert.equal(result.failure, UPSTREAM_AUTH_FAILURES.FORBIDDEN);
  });

  it("keeps the original error as the cause", () => {
    const axiosError = buildAxiosError(401);

    const result = toUpstreamAuthError(axiosError, ROUTE, METHOD);

    assert.equal(result?.cause, axiosError);
  });

  it("ignores other API failure statuses", () => {
    assert.equal(
      toUpstreamAuthError(buildAxiosError(404), ROUTE, METHOD),
      undefined,
    );
    assert.equal(
      toUpstreamAuthError(buildAxiosError(500), ROUTE, METHOD),
      undefined,
    );
  });

  it("ignores requests that failed without a response", () => {
    const networkError = new AxiosError(
      "Network Error",
      AxiosError.ERR_NETWORK,
    );

    assert.equal(toUpstreamAuthError(networkError, ROUTE, METHOD), undefined);
  });

  it("ignores errors that did not come from the API", () => {
    assert.equal(
      toUpstreamAuthError(new Error("boom"), ROUTE, METHOD),
      undefined,
    );
    assert.equal(toUpstreamAuthError(undefined, ROUTE, METHOD), undefined);
    assert.equal(toUpstreamAuthError("unauthorised", ROUTE, METHOD), undefined);
  });
});
