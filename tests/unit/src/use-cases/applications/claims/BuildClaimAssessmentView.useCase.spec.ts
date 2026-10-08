import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";

describe("BuildClaimAssessmentViewUseCase", () => {
  const finalBillBaseClaim: ClaimDetail = {
    claimReference: "INQC-0010-0010",
    claimTypeId: "FINAL_BILL",
    submissionDate: "2026-08-11T12:52:29.677Z",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    totalAmount: "1200.00",
    totalFundsRemainingAfterClaim: "8800.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    substantiveCostLimitation: 10000,
    inquestOutcomes: ["ACCIDENT_OR_MISADVENTURE", "UNLAWFUL_OR_LAWFUL_KILLING"],
    hasAlternativeFunding: false,
    numberOfCounselInstructed: 2,
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

  const poaBaseClaim: ClaimDetail = {
    claimReference: "INQC-0011-0011",
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-11T12:52:29.677Z",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    totalAmount: "1200.00",
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
    claimsPortStub.getClaimById.resolves(poaBaseClaim);

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0011-0011",
      accessToken: "token",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      laaReference: "5",
      claimReference: "INQC-0011-0011",
      claimStatus: "Reject",
      isAssessed: true,
      overview: {
        paymentType: "Payment on account",
        paymentAmount: "£1,200",
        substantiveCertificate: "£10,000",
        totalRemaining: "£8,800",
      },
      claimDetails: {
        vatZeroTotal: "-",
        netTotal: "£1,000",
        grossTotal: "£1,200",
      },
      claimCostBreakdown: null,
      supportingEvidence: [
        {
          fileName: "claim-evidence-1.pdf",
          fileFormat: "pdf",
          fileSize: "",
          viewHref:
            "/applications/5/claims/INQC-0011-0011/evidence/test_evidence_1?disposition=inline",
          downloadHref:
            "/applications/5/claims/INQC-0011-0011/evidence/test_evidence_1?disposition=attachment",
        },
      ],
    });
  });

  describe("isAssessed", () => {
    async function buildViewFor(
      claimDecision: ClaimDetail["claimDecision"],
    ): Promise<boolean> {
      const applicationPortStub = stubInterface<ApplicationPort>();
      const claimsPortStub = stubInterface<ClaimsPort>();

      applicationPortStub.getApplication.resolves({
        laaReference: "5",
        proceeding: { substantiveCostLimitation: 10000 },
      } as any);
      claimsPortStub.getClaimById.resolves({
        ...poaBaseClaim,
        claimDecision,
      });

      const result = await new BuildClaimAssessmentViewUseCase(
        applicationPortStub,
        claimsPortStub,
      ).execute({ laaReference: "5", claimReference: "INQC-0011-0011" });

      assert.equal(result.status, "SUCCESS");
      return result.data.isAssessed;
    }

    it("is true when the claim decision is pay in full", async () => {
      assert.equal(
        await buildViewFor({
          claimDecisionId: 1,
          decision: "PAY_IN_FULL",
          decisionReasons: [],
        }),
        true,
      );
    });

    it("is true when the claim decision is reject", async () => {
      assert.equal(
        await buildViewFor({
          claimDecisionId: 1,
          decision: "REJECT",
          decisionReasons: [],
        }),
        true,
      );
    });

    it("is false when the claim has no decision", async () => {
      assert.equal(await buildViewFor(null), false);
    });
  });

  it("builds a claim cost breakdown row and excludes it from other evidence for a final bill claim", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: 5,
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...finalBillBaseClaim,
      claimReference: "INQC-0013-0013",
      claimTypeId: "FINAL_BILL",
      poaTypeId: null,
      claimCostTemplateFile: {
        claimCostTemplateFileId: "test_cost_breakdown",
        claimCostTemplateFileName: "final_bill_costs.xlsx",
      },
      claimEvidence: [
        {
          claimEvidenceId: "test_evidence_1",
          fileName: "claim-evidence-1.pdf",
        },
      ],
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0013-0013",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.claimCostBreakdown, {
      fileName: "final_bill_costs.xlsx",
      fileFormat: "xlsx",
      fileSize: "",
      downloadHref:
        "/applications/5/claims/INQC-0013-0013/evidence/test_cost_breakdown?disposition=attachment",
    });
    assert.deepEqual(result.data.supportingEvidence, [
      {
        fileName: "claim-evidence-1.pdf",
        fileFormat: "pdf",
        fileSize: "",
        viewHref:
          "/applications/5/claims/INQC-0013-0013/evidence/test_evidence_1?disposition=inline",
        downloadHref:
          "/applications/5/claims/INQC-0013-0013/evidence/test_evidence_1?disposition=attachment",
      },
    ]);
  });

  describe("claimDetails", () => {
    async function buildClaimDetailsFor(claim: ClaimDetail) {
      const applicationPortStub = stubInterface<ApplicationPort>();
      const claimsPortStub = stubInterface<ClaimsPort>();

      applicationPortStub.getApplication.resolves({
        laaReference: "5",
        proceeding: { substantiveCostLimitation: 10000 },
      } as any);
      claimsPortStub.getClaimById.resolves(claim);

      const result = await new BuildClaimAssessmentViewUseCase(
        applicationPortStub,
        claimsPortStub,
      ).execute({ laaReference: "5", claimReference: "INQC-0011-0011" });

      assert.equal(result.status, "SUCCESS");
      return result.data.claimDetails;
    }

    it("uses a placeholder for the 0% VAT total when it was not submitted", async () => {
      assert.deepEqual(
        await buildClaimDetailsFor({
          ...poaBaseClaim,
          totalProfitCostNet: "100.00",
          totalProfitCostGross: "120.00",
          totalProfitCostVatZero: null,
          totalAmount: "120.00",
        }),
        { vatZeroTotal: "-", netTotal: "£100", grossTotal: "£120" },
      );
    });

    it("formats the 0% VAT, net and gross totals of a disbursement claim as currency", async () => {
      assert.deepEqual(
        await buildClaimDetailsFor({
          ...poaBaseClaim,
          poaTypeId: "EXPERT_COST",
          totalProfitCostNet: "1000.50",
          totalProfitCostGross: "1700.60",
          totalProfitCostVatZero: "500.00",
          totalAmount: "1700.60",
        }),
        {
          vatZeroTotal: "£500",
          netTotal: "£1,000.50",
          grossTotal: "£1,700.60",
        },
      );
    });
  });

  describe("file format and size", () => {
    async function buildFor(claim: ClaimDetail) {
      const applicationPortStub = stubInterface<ApplicationPort>();
      const claimsPortStub = stubInterface<ClaimsPort>();

      applicationPortStub.getApplication.resolves({
        laaReference: "5",
        proceeding: { substantiveCostLimitation: 10000 },
      } as any);
      claimsPortStub.getClaimById.resolves(claim);

      const result = await new BuildClaimAssessmentViewUseCase(
        applicationPortStub,
        claimsPortStub,
      ).execute({ laaReference: "5", claimReference: "INQC-0010-0010" });

      assert.equal(result.status, "SUCCESS");
      return result.data;
    }

    it("exposes the lower case file format and formatted size of evidence files", async () => {
      const data = await buildFor({
        ...poaBaseClaim,
        claimEvidence: [
          {
            claimEvidenceId: "e1",
            fileName: "Evidence.PDF",
            fileSize: 104448,
          },
          { claimEvidenceId: "e2", fileName: "notes", fileSize: 1572864 },
        ],
      });

      assert.deepEqual(
        data.supportingEvidence.map(
          ({ fileFormat, fileSize }) => `${fileFormat}|${fileSize}`,
        ),
        ["pdf|102KB", "|1.5MB"],
      );
    });

    it("leaves the file size empty when the file size is not known", async () => {
      const data = await buildFor({
        ...poaBaseClaim,
        claimEvidence: [
          { claimEvidenceId: "e1", fileName: "a.pdf", fileSize: null },
        ],
      });

      assert.equal(data.supportingEvidence[0].fileSize, "");
    });

    it("exposes the file format and size of the claim cost breakdown file", async () => {
      const data = await buildFor({
        ...finalBillBaseClaim,
        claimCostTemplateFile: {
          claimCostTemplateFileId: "t1",
          claimCostTemplateFileName: "final_bill_costs.xlsx",
          fileSize: 20480,
        },
      });

      assert.equal(data.claimCostBreakdown?.fileFormat, "xlsx");
      assert.equal(data.claimCostBreakdown?.fileSize, "20KB");
    });
  });

  it("returns a null claim cost breakdown when the claim has no cost template file", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: 5,
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...finalBillBaseClaim,
      claimCostTemplateFile: null,
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0010-0010",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.claimCostBreakdown, null);
  });

  it("uses the resolved total amount for the payment amount", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: "5",
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...finalBillBaseClaim,
      totalProfitCostGross: "1200.00",
      totalProfitCostVatZero: "700.00",
      totalAmount: "700.00",
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0010-0010",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.overview.paymentAmount, "£700");
  });

  it("builds final bill details and uses placeholders for partial sections", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: 5,
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...finalBillBaseClaim,
      claimTypeId: "FINAL_BILL",
      claimCostTemplateFile: {
        claimCostTemplateFileId: "cost-template-file-id",
        claimCostTemplateFileName: "final_bill_costs.xlsx",
      },
      hasCounselBeenPaid: true,
      hasAlternativeFunding: true,
      hasRecoveryCostsAwarded: false,
      financialRecoveryPreviousPreCertificateCosts: "250.00",
      financialRecoveryCost: null,
      financialRecoveryDamages: "500.00",
      financialRecoveryInterest: null,
      payingParty: "Ministry of Justice",
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0010-0010",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.finalOrNilBillDetails, {
      claimCostTemplateFile: {
        fileName: "final_bill_costs.xlsx",
        fileFormat: "xlsx",
        fileSize: "",
        viewHref:
          "/applications/5/claims/INQC-0010-0010/evidence/cost-template-file-id?disposition=inline",
        downloadHref:
          "/applications/5/claims/INQC-0010-0010/evidence/cost-template-file-id?disposition=attachment",
      },
      supportingEvidence: [
        {
          fileName: "claim-evidence-1.pdf",
          fileFormat: "pdf",
          fileSize: "",
          viewHref:
            "/applications/5/claims/INQC-0010-0010/evidence/test_evidence_1?disposition=inline",
          downloadHref:
            "/applications/5/claims/INQC-0010-0010/evidence/test_evidence_1?disposition=attachment",
        },
      ],
      counsel: {
        numberInstructed: "2",
        hasBeenPaid: "Yes",
        lastWorkingDate: "11 August 2026",
      },
      inquestDetails: {
        outcome: "Accident or misadventure, Unlawful or lawful killing",
        alternativeFundingPostInquest: "Yes",
      },
      alternativeFundingDetails: {
        recoveryCostsMade: "No",
        previousPreCertificateCosts: "£250",
        payingParty: "Ministry of Justice",
      },
      financialRecoveryCosts: {
        costs: "-",
        damages: "£500",
        interest: "-",
        previousPreCertificateCosts: "£250",
      },
    });
  });

  it("omits alternative funding details when the claim has no alternative funding", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: 5,
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...finalBillBaseClaim,
      claimTypeId: "FINAL_BILL",
      hasAlternativeFunding: false,
      hasRecoveryCostsAwarded: false,
      financialRecoveryPreviousPreCertificateCosts: "250.00",
      payingParty: "Ministry of Justice",
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0010-0010",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(
      result.data.finalOrNilBillDetails?.alternativeFundingDetails,
      undefined,
    );
  });

  it("omits Final bill details for POA claims", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    applicationPortStub.getApplication.resolves({
      laaReference: 5,
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves({
      ...poaBaseClaim,
    });

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "INQC-0011-0011",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(
      result.data.finalOrNilBillDetails?.claimCostTemplateFile,
      undefined,
    );
    assert.equal(
      result.data.finalOrNilBillDetails?.supportingEvidence,
      undefined,
    );
    assert.equal(result.data.finalOrNilBillDetails?.counsel, undefined);
    assert.equal(result.data.finalOrNilBillDetails?.inquestDetails, undefined);
    assert.equal(
      result.data.finalOrNilBillDetails?.alternativeFundingDetails,
      undefined,
    );
    assert.equal(
      result.data.finalOrNilBillDetails?.financialRecoveryCosts,
      undefined,
    );
  });

  it("returns INVALID_INPUT when ids are missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "",
      claimReference: "",
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
  });

  it("returns NOT_FOUND when the claim does not exist", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();
    applicationPortStub.getApplication.resolves({
      proceeding: { substantiveCostLimitation: 10000 },
    } as any);
    claimsPortStub.getClaimById.resolves(undefined);

    const result = await new BuildClaimAssessmentViewUseCase(
      applicationPortStub,
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimReference: "missing",
    });

    assert.deepEqual(result, { status: "NOT_FOUND" });
  });

  it("propagates application errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const claimsPortStub = stubInterface<ClaimsPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_claim",
      true,
    );
    applicationPortStub.getApplication.rejects(error);

    await assert.rejects(
      new BuildClaimAssessmentViewUseCase(
        applicationPortStub,
        claimsPortStub,
      ).execute({
        laaReference: "5",
        claimReference: "INQC-0010-0010",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
