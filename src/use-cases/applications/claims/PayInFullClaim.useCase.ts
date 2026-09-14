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
  ): Promise<
    | { status: "SUCCESS" }
    | { status: "INVALID_INPUT" }
    | { status: "VALIDATION_ERROR"; errorCode: string }
  > {
    if (!input.laaReference || !input.claimId) {
      return { status: "INVALID_INPUT" };
    }

    const result = await this.claimsPort.payInFullClaim(
      input.laaReference,
      input.claimId,
      input.data,
      input.accessToken,
    );

    if (result.status === "VALIDATION_ERROR") {
      return { status: "VALIDATION_ERROR", errorCode: result.errorCode };
    }

    return { status: "SUCCESS" };
  }
}
