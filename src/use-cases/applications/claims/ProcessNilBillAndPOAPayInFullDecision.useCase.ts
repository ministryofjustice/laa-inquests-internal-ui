import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

interface ProcessNilBillAndPOAPayInFullDecisionInput {
  laaReference: string;
  claimReference: string;
  accessToken?: string;
}

/**
 * Processes "Pay in full" for Nil bills and payment-on-account claims.
 * Neither needs the caseworker to confirm costs before submitting a decision.
 * Final bills retain the existing cost-confirmation journey.
 */
export class ProcessNilBillAndPOAPayInFullDecisionUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: ProcessNilBillAndPOAPayInFullDecisionInput,
  ): Promise<
    | { status: "NOT_FOUND" }
    | { status: "CONTINUE_JOURNEY" }
    | { status: "SUCCESS" }
    | { status: "VALIDATION_ERROR"; errorCode: string }
  > {
    const claim = await this.claimsPort.getClaimById(
      input.laaReference,
      input.claimReference,
      input.accessToken,
    );

    if (claim === undefined) {
      return { status: "NOT_FOUND" };
    }

    if (
      claim.claimTypeId !== "NIL_BILL" &&
      claim.claimTypeId !== "PAYMENT_ON_ACCOUNT"
    ) {
      return { status: "CONTINUE_JOURNEY" };
    }

    const result = await this.claimsPort.payInFullClaim(
      input.laaReference,
      input.claimReference,
      {},
      input.accessToken,
    );

    if (result.status === "VALIDATION_ERROR") {
      return { status: "VALIDATION_ERROR", errorCode: result.errorCode };
    }

    return { status: "SUCCESS" };
  }
}
