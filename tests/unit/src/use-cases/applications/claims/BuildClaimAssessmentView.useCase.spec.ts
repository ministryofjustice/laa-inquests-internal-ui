import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";

describe("BuildClaimAssessmentViewUseCase", () => {
  const useCase = new BuildClaimAssessmentViewUseCase();

  const baseClaim: ClaimDetail = {
    claimId: 10,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-11T12:52:29.677Z",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    totalFundsRemainingAfterClaim: "8800.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    substantiveCostLimitation: 10000,
    claimEvidence: [
      {
        claimEvidenceId: "test_evidence_1",
        fileName: "claim-evidence-1.pdf",
      },
    ],
    claimDecision: {
      claimDecisionId: 88,
      decision: "REJECT",
      decisionReasons: [
        { reasonCode: "MANUAL_REJECTION", justification: "reject" },
      ],
    },
  };

  it("builds claim assessment data using claimDecision decision for status", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: "5",
      proceeding: { substantiveCostLimitation: 9999 },
    } as any);
    claimsPortStub.getClaimById.resolves(baseClaim);

    const result = await useCase.execute({
      applicationId: "5",
      claimId: "10",
      applicationPort: applicationPortStub,
      claimsPort: claimsPortStub,
      accessToken: "token",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      laaReference: "5",
      claimId: "10",
      claimStatus: "Reject",
      overview: {
        paymentType: "Payment on account",
        paymentAmount: "£1,200",
        substantiveCertificate: "£10,000",
        totalRemaining: "£8,800",
      },
      details: {
        instructedCounsel: "-",
        lastWorkingDate: "-",
        outcomeOfInquest: "-",
        alternateFundingProgressed: "-",
      },
      supportingEvidence: [
        {
          fileName: "claim-evidence-1.pdf",
          viewHref:
            "/applications/5/claims/10/evidence/test_evidence_1?disposition=inline",
          downloadHref:
            "/applications/5/claims/10/evidence/test_evidence_1?disposition=attachment",
        },
      ],
    });
  });

  it("prefers vat zero amount over gross when both are present", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: "5",
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      totalProfitCostGross: "1200.00",
      totalProfitCostVatZero: "700.00",
    });

    const result = await useCase.execute({
      applicationId: "5",
      claimId: "10",
      applicationPort: applicationPortStub,
      claimsPort: claimsPortStub,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.overview.paymentAmount, "£700");
  });

  it("returns TECHNICAL_FAILURE when ids are missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await useCase.execute({
      applicationId: "",
      claimId: "",
      applicationPort: applicationPortStub,
      claimsPort: claimsPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns TECHNICAL_FAILURE when an upstream dependency fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "5",
      claimId: "10",
      applicationPort: applicationPortStub,
      claimsPort: claimsPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
