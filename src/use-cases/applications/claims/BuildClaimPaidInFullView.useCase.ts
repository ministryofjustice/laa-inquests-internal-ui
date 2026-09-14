import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { mapClaimType } from "#src/utils/claim.js";

interface BuildClaimPaidInFullViewInput {
  laaReference: string;
  claimId: string;
  accessToken?: string;
}

export interface ClaimPaidInFullViewData {
  claimType: string;
}

export type BuildClaimPaidInFullViewResult =
  | { status: "SUCCESS"; data: ClaimPaidInFullViewData }
  | { status: "INVALID_INPUT" }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_CLAIM_TYPE" };

export class BuildClaimPaidInFullViewUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: BuildClaimPaidInFullViewInput,
  ): Promise<BuildClaimPaidInFullViewResult> {
    if (!input.laaReference || !input.claimId) {
      return { status: "INVALID_INPUT" };
    }

    const claim = await this.claimsPort.getClaimById(
      input.laaReference,
      input.claimId,
      input.accessToken,
    );
    if (claim === undefined) return { status: "NOT_FOUND" };

    try {
      return {
        status: "SUCCESS",
        data: {
          claimType: mapClaimType(claim.claimTypeId),
        },
      };
    } catch {
      return { status: "INVALID_CLAIM_TYPE" };
    }
  }
}
