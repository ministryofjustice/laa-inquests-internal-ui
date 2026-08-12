import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";

export interface ClaimsPort {
  getClaims: (
    applicationId: string,
    assessed: boolean,
    accessToken: string | undefined,
  ) => Promise<ClaimSummary[]>;
  getClaimById: (
    applicationId: string,
    claimId: string,
    accessToken: string | undefined,
  ) => Promise<ClaimDetail>;
}
