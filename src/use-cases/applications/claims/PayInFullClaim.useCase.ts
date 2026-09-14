import type {
  ClaimsPort,
  PayInFullClaimData,
} from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

interface PayInFullClaimInput {
  laaReference: string;
  claimId: string;
  data: PayInFullClaimData;
  accessToken?: string;
}

export class PayInFullClaimUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: PayInFullClaimInput,
  ): Promise<{ status: "SUCCESS" } | { status: "INVALID_INPUT" }> {
    if (!input.laaReference || !input.claimId) {
      return { status: "INVALID_INPUT" };
    }

    await this.claimsPort.payInFullClaim(
      input.laaReference,
      input.claimId,
      input.data,
      input.accessToken,
    );
    return { status: "SUCCESS" };
  }
}
