import type { Claim } from "#src/adaptors/models/claim.types.js";

export interface ClaimsPort {
  getClaims: (
    applicationId: string,
    assessed: boolean,
    accessToken: string | undefined,
  ) => Promise<Claim[]>;
  getClaimById: (
    applicationId: string,
    claimId: string,
    accessToken: string | undefined,
  ) => Promise<Claim>;
}
