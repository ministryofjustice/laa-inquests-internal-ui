import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { mapClaimType } from "#src/utils/claim.js";

interface BuildClaimRejectionViewInput {
  laaReference: string;
  claimId: string;
  accessToken?: string;
}

export interface ClaimRejectionViewData {
  claimType: string;
}

export type BuildClaimRejectionViewResult =
  | { status: "SUCCESS"; data: ClaimRejectionViewData }
  | { status: "INVALID_INPUT" }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_CLAIM_TYPE" };

export class BuildClaimRejectionViewUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: BuildClaimRejectionViewInput,
  ): Promise<BuildClaimRejectionViewResult> {
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
