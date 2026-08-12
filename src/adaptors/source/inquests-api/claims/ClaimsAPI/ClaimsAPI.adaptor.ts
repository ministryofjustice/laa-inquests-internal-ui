import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import {
  ClaimDetailSchema,
  ClaimSummariesSchema,
} from "#src/adaptors/models/claim.schema.js";
import { getInquestsApi } from "#src/adaptors/source/inquests-api/utils.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

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
    const { data }: AxiosResponse<ClaimSummary[]> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims`,
      accessToken,
      axiosConfig: { params: { assessed } },
    });

    return ClaimSummariesSchema.parse(data);
  }

  async getClaimById(
    applicationId: string,
    claimId: string,
    accessToken: string | undefined,
  ): Promise<ClaimDetail> {
    const { data }: AxiosResponse<ClaimDetail> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims/${claimId}`,
      accessToken,
    });

    return ClaimDetailSchema.parse(data);
  }
}
