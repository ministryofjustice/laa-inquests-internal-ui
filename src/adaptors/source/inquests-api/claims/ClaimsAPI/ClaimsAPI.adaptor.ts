import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type { Claim } from "#src/adaptors/models/claim.types.js";
import {
  ClaimSchema,
  ClaimsSchema,
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
  ): Promise<Claim[]> {
    const { data }: AxiosResponse<Claim[]> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims`,
      accessToken,
      axiosConfig: { params: { assessed } },
    });

    return ClaimsSchema.parse(data);
  }

  async getClaimById(
    applicationId: string,
    claimId: string,
    accessToken: string | undefined,
  ): Promise<Claim> {
    const { data }: AxiosResponse<Claim> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/claims/${claimId}`,
      accessToken,
    });

    return ClaimSchema.parse(data);
  }
}
