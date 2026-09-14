import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";
import type { Disposition } from "#src/infrastructure/locales/constants.js";

export interface PayInFullClaimData {
  profitCostNet?: number;
  profitCostGross?: number;
  profitCostVatZero?: number;
  disbursementNet?: number;
  disbursementGross?: number;
  disbursementVatZero?: number;
}

export interface ClaimsPort {
  getClaims: (
    laaReference: string,
    assessed: boolean,
    accessToken: string | undefined,
  ) => Promise<ClaimSummary[]>;
  getClaimById: (
    laaReference: string,
    claimId: string,
    accessToken: string | undefined,
  ) => Promise<ClaimDetail | undefined>;
  getClaimEvidence: (
    claimEvidenceId: string,
    disposition: Disposition,
    accessToken: string | undefined,
  ) => Promise<
    | {
        data: Buffer;
        contentType: string;
        contentDisposition: string;
      }
    | undefined
  >;
  rejectClaim: (
    laaReference: string,
    claimId: string,
    justification: string,
    accessToken: string | undefined,
  ) => Promise<void>;
  payInFullClaim: (
    laaReference: string,
    claimId: string,
    data: PayInFullClaimData,
    accessToken: string | undefined,
  ) => Promise<void>;
}
