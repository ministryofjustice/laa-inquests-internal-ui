import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import type { Disposition } from "#src/infrastructure/locales/constants.js";
import {
  ClaimDetailSchema,
  ClaimSummariesSchema,
} from "#src/adaptors/models/claim.schema.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import {
  classifyClaimsApiHttpFailure,
  getClaimsUpstreamStatusContext,
  type ClaimsApiHttpFailure,
} from "#src/adaptors/source/inquests-api/claims/ClaimsAPI/claimsApiFailure.js";

interface ClaimsApiRequest {
  http: AxiosStatic;
  baseUrl: string;
  accessToken: string | undefined;
}

interface OperationMetadata {
  operation: string;
  route: string;
}

const GET_CLAIMS = {
  operation: "get_claims",
  route: "/applications/:id/claims",
};

const GET_CLAIM = {
  operation: "get_claim",
  route: "/applications/:id/claims/:id",
};

const GET_CLAIM_EVIDENCE = {
  operation: "get_claim_evidence",
  route: "/claims/:id",
};

function requireAccessToken(
  accessToken: string | undefined,
  metadata: OperationMetadata,
  identifiers: Record<string, unknown>,
  startedAt: number,
): string {
  if (typeof accessToken === "string" && accessToken !== "") return accessToken;
  logger.logError({
    functionName: "claims_api_adaptor",
    message: "Claims API request is missing credentials",
    extraContext: {
      event: "outbound_api_request_failed",
      operation: metadata.operation,
      upstream_method: "GET",
      upstream_route: metadata.route,
      failure_reason: "missing_credentials",
      retryable: false,
      duration_ms: Date.now() - startedAt,
      ...identifiers,
    },
  });
  throw new ApplicationError(
    APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    metadata.operation,
    false,
  );
}

function throwClaimsFailure(
  error: unknown,
  metadata: OperationMetadata,
  identifiers: Record<string, unknown>,
  startedAt: number,
): never {
  if (error instanceof ApplicationError) throw error;
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) throw error;
    throw new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
      metadata.operation,
      false,
    );
  }
  const classified = classifyClaimsApiHttpFailure(error);
  const failure: Exclude<ClaimsApiHttpFailure, { outcome: "NOT_FOUND" }> =
    classified.outcome === "NOT_FOUND"
      ? {
          outcome: "ERROR",
          type: APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
          failureReason: "upstream_4xx",
          retryable: false,
          status: classified.status,
        }
      : classified;
  logger.logError({
    functionName: "claims_api_adaptor",
    message: "Claims API request failed",
    err: error,
    extraContext: {
      event: "outbound_api_request_failed",
      operation: metadata.operation,
      upstream_method: "GET",
      upstream_route: metadata.route,
      ...getClaimsUpstreamStatusContext(failure.status),
      failure_reason: failure.failureReason,
      retryable: failure.retryable,
      duration_ms: Date.now() - startedAt,
      ...identifiers,
    },
  });
  throw new ApplicationError(
    failure.type,
    metadata.operation,
    failure.retryable,
  );
}

export async function getClaims(
  request: ClaimsApiRequest & { laaReference: string; assessed: boolean },
): Promise<ClaimSummary[]> {
  const { http, baseUrl, laaReference, assessed } = request;
  const startedAt = Date.now();
  const identifiers = { laa_reference: laaReference, assessed };
  const accessToken = requireAccessToken(
    request.accessToken,
    GET_CLAIMS,
    identifiers,
    startedAt,
  );
  try {
    const { data }: AxiosResponse<ClaimSummary[]> = await http.get(
      `${baseUrl}/applications/${encodeURIComponent(laaReference)}/claims`,
      {
        params: { assessed },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const result = ClaimSummariesSchema.safeParse(data);
    if (!result.success) {
      logger.logError({
        functionName: "claims_api_adaptor",
        message: "Claims response validation failed",
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_CLAIMS.operation,
          upstream_method: "GET",
          upstream_route: GET_CLAIMS.route,
          failure_reason: "invalid_response",
          retryable: false,
          duration_ms: Date.now() - startedAt,
          ...identifiers,
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
        GET_CLAIMS.operation,
        false,
      );
    }
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claims retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        operation: GET_CLAIMS.operation,
        upstream_method: "GET",
        upstream_route: GET_CLAIMS.route,
        duration_ms: Date.now() - startedAt,
        ...identifiers,
      },
    });
    return result.data;
  } catch (error) {
    throwClaimsFailure(error, GET_CLAIMS, identifiers, startedAt);
  }
}

export async function getClaimById(
  request: ClaimsApiRequest & { laaReference: string; claimId: string },
): Promise<ClaimDetail | undefined> {
  const { http, baseUrl, laaReference, claimId } = request;
  const startedAt = Date.now();
  const identifiers = {
    laa_reference: laaReference,
    claim_reference: claimId,
  };
  const accessToken = requireAccessToken(
    request.accessToken,
    GET_CLAIM,
    identifiers,
    startedAt,
  );
  try {
    const { data }: AxiosResponse<ClaimDetail> = await http.get(
      `${baseUrl}/applications/${encodeURIComponent(laaReference)}/claims/${encodeURIComponent(claimId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const result = ClaimDetailSchema.safeParse(data);
    if (!result.success) {
      logger.logError({
        functionName: "claims_api_adaptor",
        message: "Claim response validation failed",
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_CLAIM.operation,
          upstream_method: "GET",
          upstream_route: GET_CLAIM.route,
          failure_reason: "invalid_response",
          retryable: false,
          duration_ms: Date.now() - startedAt,
          ...identifiers,
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
        GET_CLAIM.operation,
        false,
      );
    }
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claim retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        operation: GET_CLAIM.operation,
        upstream_method: "GET",
        upstream_route: GET_CLAIM.route,
        duration_ms: Date.now() - startedAt,
        ...identifiers,
      },
    });
    return result.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const failure = classifyClaimsApiHttpFailure(error);
      if (failure.outcome === "NOT_FOUND") {
        logger.logWarn({
          functionName: "claims_api_adaptor",
          message: "Claim not found upstream",
          extraContext: {
            event: "outbound_api_not_found",
            operation: GET_CLAIM.operation,
            upstream_method: "GET",
            upstream_route: GET_CLAIM.route,
            upstream_status_code: failure.status,
            duration_ms: Date.now() - startedAt,
            ...identifiers,
          },
        });
        return undefined;
      }
    }
    throwClaimsFailure(error, GET_CLAIM, identifiers, startedAt);
  }
}

export async function getClaimEvidence(
  request: ClaimsApiRequest & {
    claimEvidenceId: string;
    disposition: Disposition;
  },
): Promise<
  { data: Buffer; contentType: string; contentDisposition: string } | undefined
> {
  const { http, baseUrl, claimEvidenceId, disposition } = request;
  const startedAt = Date.now();
  const identifiers = { claim_evidence_id: claimEvidenceId, disposition };
  const accessToken = requireAccessToken(
    request.accessToken,
    GET_CLAIM_EVIDENCE,
    identifiers,
    startedAt,
  );
  try {
    const response: AxiosResponse<ArrayBuffer> = await http.get(
      `${baseUrl}/claims/${encodeURIComponent(claimEvidenceId)}`,
      {
        params: { disposition },
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claim evidence retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        operation: GET_CLAIM_EVIDENCE.operation,
        upstream_method: "GET",
        upstream_route: GET_CLAIM_EVIDENCE.route,
        duration_ms: Date.now() - startedAt,
        ...identifiers,
      },
    });
    const { headers, data } = response;
    const {
      "content-type": contentType,
      "content-disposition": contentDisposition,
    } = headers;
    return {
      data: Buffer.from(data),
      contentType:
        typeof contentType === "string"
          ? contentType
          : "application/octet-stream",
      contentDisposition:
        typeof contentDisposition === "string"
          ? contentDisposition
          : disposition,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const failure = classifyClaimsApiHttpFailure(error);
      if (failure.outcome === "NOT_FOUND") {
        logger.logWarn({
          functionName: "claims_api_adaptor",
          message: "Claim evidence not found upstream",
          extraContext: {
            event: "outbound_api_not_found",
            operation: GET_CLAIM_EVIDENCE.operation,
            upstream_method: "GET",
            upstream_route: GET_CLAIM_EVIDENCE.route,
            upstream_status_code: failure.status,
            duration_ms: Date.now() - startedAt,
            ...identifiers,
          },
        });
        return undefined;
      }
    }
    throwClaimsFailure(error, GET_CLAIM_EVIDENCE, identifiers, startedAt);
  }
}
