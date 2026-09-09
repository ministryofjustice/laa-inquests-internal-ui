import { strict as assert } from "assert";
import { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { translateInquestsApiError } from "#src/adaptors/source/inquests-api/utils.js";
import {
  APPLICATION_ERROR_KINDS,
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

describe("translateInquestsApiError", () => {
  it("classifies authentication and authorization failures", () => {
    assert.equal(
      translateInquestsApiError(buildAxiosError(401), "get_application").kind,
      APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
    );
    assert.equal(
      translateInquestsApiError(buildAxiosError(403), "get_application").kind,
      APPLICATION_ERROR_KINDS.FORBIDDEN,
    );
  });

  it("classifies upstream availability and rejection failures", () => {
    assert.equal(
      translateInquestsApiError(buildAxiosError(500), "get_application").kind,
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
    );
    assert.equal(
      translateInquestsApiError(buildAxiosError(404), "get_application").kind,
      APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
    );
  });

  it("sanitizes non-Axios failures", () => {
    const result = translateInquestsApiError(
      new Error("network"),
      "get_application",
    );

    assert.ok(result instanceof ApplicationError);
    assert.equal(result.kind, APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE);
  });

  it("preserves an existing application error", () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_KINDS.FORBIDDEN,
      "get_application",
      false,
    );

    assert.equal(translateInquestsApiError(error, "get_application"), error);
  });
});
