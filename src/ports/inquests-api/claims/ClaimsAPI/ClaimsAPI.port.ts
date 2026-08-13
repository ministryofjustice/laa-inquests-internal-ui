import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import type { Disposition } from "#src/infrastructure/locales/constants.js";

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
  getClaimEvidence: (
    claimEvidenceId: string,
    disposition: Disposition,
    accessToken: string | undefined,
  ) => Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string;
  }>;
}
