import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import {
  ClaimDetailSchema,
  ClaimSummariesSchema,
} from "#src/adaptors/models/claim.schema.js";
import {
  getInquestsApi,
  patchInquestsApi,
} from "#src/adaptors/source/inquests-api/utils.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import type { Disposition } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ClaimsAPIAdaptor implements ClaimsPort {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getClaims(
    applicationId: string,
    assessed: boolean,
    accessToken: string | undefined,
  ): Promise<ClaimSummary[]> {
    const startedAt = Date.now();
    const { data }: AxiosResponse<ClaimSummary[]> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims`,
      accessToken,
      axiosConfig: { params: { assessed } },
    });
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claims retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/claims",
        laa_reference: applicationId,
        assessed,
        duration_ms: Date.now() - startedAt,
      },
    });

    return ClaimSummariesSchema.parse(data);
  }

  async getClaimById(
    applicationId: string,
    claimId: string,
    accessToken: string | undefined,
  ): Promise<ClaimDetail> {
    const startedAt = Date.now();
    const { data }: AxiosResponse<ClaimDetail> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims/${claimId}`,
      accessToken,
    });
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claim retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/claims/:id",
        laa_reference: applicationId,
        claim_reference: claimId,
        duration_ms: Date.now() - startedAt,
      },
    });

    return ClaimDetailSchema.parse(data);
  }

  async getClaimEvidence(
    claimEvidenceId: string,
    disposition: Disposition,
    accessToken: string | undefined,
  ): Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string;
  }> {
    const startedAt = Date.now();
    const response: AxiosResponse<ArrayBuffer> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/claims/${claimEvidenceId}`,
      accessToken,
      axiosConfig: {
        params: { disposition },
        responseType: "arraybuffer",
      },
    });
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claim evidence retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/claims/:id",
        claim_evidence_id: claimEvidenceId,
        disposition,
        duration_ms: Date.now() - startedAt,
      },
    });

    const { headers, data } = response;
    const {
      "content-type": contentType,
      "content-disposition": contentDisposition,
    } = headers;

    const contentTypeString =
      typeof contentType === "string"
        ? contentType
        : "application/octet-stream";
    const contentDispositionString =
      typeof contentDisposition === "string" ? contentDisposition : disposition;

    return {
      data: Buffer.from(data),
      contentType: contentTypeString,
      contentDisposition: contentDispositionString,
    };
  }

  async rejectClaim(
    applicationId: string,
    claimId: string,
    justification: string,
    accessToken: string | undefined,
  ): Promise<void> {
    const startedAt = Date.now();
    await patchInquestsApi<undefined, { justification: string }>({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims/${claimId}/reject`,
      body: { justification },
      accessToken,
    });
    logger.logInfo({
      functionName: "claims_api_adaptor",
      message: "Claim rejection submitted upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/claims/:id/reject",
        laa_reference: applicationId,
        claim_reference: claimId,
        duration_ms: Date.now() - startedAt,
      },
    });
  }
}
