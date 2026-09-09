import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { getClaimCost } from "#src/utils/claim.js";
import { PAYABLE_CLAIM_STATUSES } from "#src/infrastructure/locales/constants.js";

interface BuildApplicationClaimsViewInput {
  laaReference: string;
  substantiveCertificate: number;
  accessToken?: string;
}

interface BuildApplicationClaimsViewData {
  toBeAssessedClaims: ClaimSummary[];
  assessedClaims: ClaimSummary[];
  hasClaims: boolean;
  substantiveCertificate: number;
  totalRemaining: number;
}

export type BuildApplicationClaimsViewResult =
  | { status: "SUCCESS"; data: BuildApplicationClaimsViewData }
  | { status: "INVALID_INPUT" };

export class BuildApplicationClaimsViewUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: BuildApplicationClaimsViewInput,
  ): Promise<BuildApplicationClaimsViewResult> {
    if (!input.laaReference) {
      return { status: "INVALID_INPUT" };
    }

    const [toBeAssessedClaims, assessedClaims] = await Promise.all([
      this.claimsPort.getClaims(input.laaReference, false, input.accessToken),
      this.claimsPort.getClaims(input.laaReference, true, input.accessToken),
    ]);

    sortByDateDescending(toBeAssessedClaims);
    sortByDateDescending(assessedClaims);

    const amountClaimed = assessedClaims
      .filter((claim) =>
        PAYABLE_CLAIM_STATUSES.includes(
          claim.statusId ?? claim.claimDecisionStatus ?? "",
        ),
      )
      .reduce((total, claim) => total + getClaimCost(claim), 0);

    return {
      status: "SUCCESS",
      data: {
        toBeAssessedClaims,
        assessedClaims,
        hasClaims: toBeAssessedClaims.length + assessedClaims.length > 0,
        substantiveCertificate: input.substantiveCertificate,
        totalRemaining: input.substantiveCertificate - amountClaimed,
      },
    };
  }
}

function sortByDateDescending(claims: ClaimSummary[]): void {
  claims.sort(
    (first, second) =>
      new Date(second.submissionDate).getTime() -
      new Date(first.submissionDate).getTime(),
  );
}
