import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

interface ProcessNilBillPayInFullDecisionInput {
  laaReference: string;
  claimReference: string;
  accessToken?: string;
}

const NIL_BILL_CLAIM_TYPE_ID = "NIL_BILL";

/**
 * Fast-tracks a "Pay in full" decision for a Nil bill claim: a Nil bill has
 * no profit cost or disbursement amounts to confirm, so this submits the
 * decision immediately instead of sending the caseworker through the
 * confirm-profit-costs / confirm-disbursement-costs / check-your-answers
 * pages. Claims of any other type leave the existing journey untouched.
 */
export class ProcessNilBillPayInFullDecisionUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: ProcessNilBillPayInFullDecisionInput,
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

    if (claim.claimTypeId !== NIL_BILL_CLAIM_TYPE_ID) {
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
