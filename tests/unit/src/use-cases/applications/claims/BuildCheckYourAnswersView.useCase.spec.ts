import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const claim = {
  claimId: 10,
  claimTypeId: "FINAL_BILL",
  submissionDate: "2026-08-11",
  totalProfitCostNet: "1000",
  totalProfitCostGross: "1200",
  totalProfitCostVatZero: null,
  totalFundsRemainingAfterClaim: "8800",
  poaTypeId: null,
  statusId: "SUBMITTED",
} as ClaimDetail;

describe("BuildCheckYourAnswersViewUseCase", () => {
  it("returns formatted check your answers data", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    claimsPort.getClaimById.resolves(claim);
    const useCase = new BuildCheckYourAnswersViewUseCase(claimsPort);

    const result = await useCase.execute({
      laaReference: "123",
      claimId: "10",
      profitCosts: { netTotal: "300", grossTotal: "360" },
      disbursementCosts: { netTotal: "500", grossTotal: "600" },
    });

    assert.equal(result.status, "SUCCESS");
    if (result.status === "SUCCESS") {
      assert.equal(result.data.finalBill, "£1,200");
      assert.equal(result.data.profitCosts.netTotal, "£300");
      assert.equal(result.data.disbursementCosts.grossTotal, "£600");
    }
  });

  it("returns INVALID_INPUT without calling the port", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    const useCase = new BuildCheckYourAnswersViewUseCase(claimsPort);

    assert.deepEqual(
      await useCase.execute({
        laaReference: "",
        claimId: "",
        profitCosts: {},
        disbursementCosts: {},
      }),
      { status: "INVALID_INPUT" },
    );
    assert.equal(claimsPort.getClaimById.callCount, 0);
  });

  it("returns NOT_FOUND when the claim does not exist", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    claimsPort.getClaimById.resolves(undefined);
    const useCase = new BuildCheckYourAnswersViewUseCase(claimsPort);

    assert.deepEqual(
      await useCase.execute({
        laaReference: "123",
        claimId: "missing",
        profitCosts: {},
        disbursementCosts: {},
      }),
      { status: "NOT_FOUND" },
    );
  });

  it("propagates application errors unchanged", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      "get_claim",
      true,
    );
    claimsPort.getClaimById.rejects(error);
    const useCase = new BuildCheckYourAnswersViewUseCase(claimsPort);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        claimId: "10",
        profitCosts: {},
        disbursementCosts: {},
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
