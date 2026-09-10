import axios, { type AxiosStatic } from "axios";
import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import type { Disposition } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  getClaimById,
  getClaimEvidence,
  getClaims,
} from "#src/adaptors/source/inquests-api/claims/ClaimsAPI/claimsReadOperations.js";
import {
  classifyClaimsApiHttpFailure,
  getClaimsUpstreamStatusContext,
} from "#src/adaptors/source/inquests-api/claims/ClaimsAPI/claimsApiFailure.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const REJECT_CLAIM_OPERATION = "reject_claim";
const REJECT_CLAIM_ROUTE = "/applications/:id/claims/:id/reject";

export class ClaimsAPIAdaptor implements ClaimsPort {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getClaims(
    laaReference: string,
    assessed: boolean,
    accessToken: string | undefined,
  ): Promise<ClaimSummary[]> {
    return await getClaims({
      http: this.http,
      baseUrl: this.baseUrl,
      laaReference,
      assessed,
      accessToken,
    });
  }

  async getClaimById(
    laaReference: string,
    claimId: string,
    accessToken: string | undefined,
  ): Promise<ClaimDetail | undefined> {
    return await getClaimById({
      http: this.http,
      baseUrl: this.baseUrl,
      laaReference,
      claimId,
      accessToken,
    });
  }

  async getClaimEvidence(
    claimEvidenceId: string,
    disposition: Disposition,
    accessToken: string | undefined,
  ): Promise<
    | {
        data: Buffer;
        contentType: string;
        contentDisposition: string;
      }
    | undefined
  > {
    return await getClaimEvidence({
      http: this.http,
      baseUrl: this.baseUrl,
      claimEvidenceId,
      disposition,
      accessToken,
    });
  }

  async rejectClaim(
    laaReference: string,
    claimId: string,
    justification: string,
    accessToken: string | undefined,
  ): Promise<void> {
    const startedAt = Date.now();
    if (typeof accessToken !== "string" || accessToken === "") {
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        REJECT_CLAIM_OPERATION,
        false,
      );
    }
    try {
      await this.http.patch(
        `${this.baseUrl}/applications/${laaReference}/claims/${claimId}/reject`,
        { justification },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      logger.logInfo({
        functionName: "claims_api_adaptor",
        message: "Claim rejection submitted upstream",
        extraContext: {
          event: "outbound_api_call",
          operation: REJECT_CLAIM_OPERATION,
          upstream_method: "PATCH",
          upstream_route: REJECT_CLAIM_ROUTE,
          laa_reference: laaReference,
          claim_reference: claimId,
          duration_ms: Date.now() - startedAt,
        },
      });
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        if (error instanceof Error) throw error;
        throw new ApplicationError(
          APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
          REJECT_CLAIM_OPERATION,
          false,
        );
      }
      const classified = classifyClaimsApiHttpFailure(error);
      const failure =
        classified.outcome === "NOT_FOUND"
          ? {
              type: APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
              failureReason: "upstream_4xx",
              retryable: false,
              status: classified.status,
            }
          : classified;
      logger.logError({
        functionName: "claims_api_adaptor",
        message: "Claim rejection request failed",
        err: error,
        extraContext: {
          event: "outbound_api_request_failed",
          operation: REJECT_CLAIM_OPERATION,
          upstream_method: "PATCH",
          upstream_route: REJECT_CLAIM_ROUTE,
          ...getClaimsUpstreamStatusContext(failure.status),
          failure_reason: failure.failureReason,
          retryable: failure.retryable,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
          claim_reference: claimId,
        },
      });
      throw new ApplicationError(
        failure.type,
        REJECT_CLAIM_OPERATION,
        failure.retryable,
      );
    }
  }
}
