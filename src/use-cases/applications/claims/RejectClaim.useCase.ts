import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

interface RejectClaimInput {
  laaReference: string;
  claimReference: string;
  justification: string;
  accessToken?: string;
}

export class RejectClaimUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: RejectClaimInput,
  ): Promise<{ status: "SUCCESS" } | { status: "INVALID_INPUT" }> {
    if (!input.laaReference || !input.claimReference) {
      return { status: "INVALID_INPUT" };
    }

    await this.claimsPort.rejectClaim(
      input.laaReference,
      input.claimReference,
      input.justification,
      input.accessToken,
    );
    return { status: "SUCCESS" };
  }
}
