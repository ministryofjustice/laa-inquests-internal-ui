import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationClaimsViewUseCase } from "#src/use-cases/applications/claims/BuildApplicationClaimsView.useCase.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import type { Claim } from "#src/adaptors/models/claim.types.js";

describe("BuildApplicationClaimsViewUseCase", () => {
  const useCase = new BuildApplicationClaimsViewUseCase();

  const toBeAssessedClaim: Claim = {
    claimId: 10,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-10T13:37:56.629563",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
  };

  const assessedClaim: Claim = {
    claimId: 20,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-07-01T09:00:00.000000",
    totalProfitCostNet: "1600.00",
    totalProfitCostGross: "2000.00",
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "PAY_IN_FULL",
    claimDecisionStatus: "PAY_IN_FULL",
  };

  it("returns both claim lists split by the assessed query param", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaims
      .withArgs("123", false, "token")
      .resolves([toBeAssessedClaim]);
    claimsPortStub.getClaims
      .withArgs("123", true, "token")
      .resolves([assessedClaim]);

    const result = await useCase.execute({
      applicationId: "123",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
      accessToken: "token",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.toBeAssessedClaims, [toBeAssessedClaim]);
    assert.deepEqual(result.data.assessedClaims, [assessedClaim]);
    assert.equal(result.data.hasClaims, true);
  });

  it("computes total remaining from the substantive certificate minus assessed gross", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaims
      .withArgs("123", false, undefined)
      .resolves([toBeAssessedClaim]);
    claimsPortStub.getClaims
      .withArgs("123", true, undefined)
      .resolves([
        assessedClaim,
        { ...assessedClaim, totalProfitCostGross: "500.00" },
      ]);

    const result = await useCase.execute({
      applicationId: "123",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.substantiveCertificate, 10000);
    assert.equal(result.data.totalRemaining, 7500);
  });

  it("treats a null gross value as zero when calculating the remaining total", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaims.withArgs("123", false, undefined).resolves([]);
    claimsPortStub.getClaims
      .withArgs("123", true, undefined)
      .resolves([{ ...assessedClaim, totalProfitCostGross: null }]);

    const result = await useCase.execute({
      applicationId: "123",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.totalRemaining, 10000);
  });

  it("returns hasClaims false when both lists are empty", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaims.resolves([]);

    const result = await useCase.execute({
      applicationId: "123",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.hasClaims, false);
    assert.deepEqual(result.data.toBeAssessedClaims, []);
    assert.deepEqual(result.data.assessedClaims, []);
  });

  it("returns TECHNICAL_FAILURE when applicationId is missing", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await useCase.execute({
      applicationId: "",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns TECHNICAL_FAILURE when the claims source fails", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaims.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "123",
      claimsPort: claimsPortStub,
      substantiveCertificate: 10000,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
