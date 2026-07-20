import { strict as assert } from "assert";
import { StubbedInstance, stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";

describe("BuildCertificateViewUseCase", () => {
  const certificateDetails = {
    laaReference: 1,
    dateCreated: "2026-05-19T15:49:07.455255",
    clientName: "John Doe",
    clientAddress: "1 Test Road, London",
    firmName: "Test Solicitors",
    officeAddress: "Test Office Address, London",
    opponentDetails: ["Cabinet Office"],
    guardianName: "Not applicable",
    guardianAddress: "Not applicable",
    certificateType: "SUBSTANTIVE",
    status: "Live",
    effectiveDate: "2026-05-21T08:46:36.793278",
    endDate: "Not applicable",
    reinstatementDate: "Not applicable",
    costLimitation: 10000,
    costLimitationEffectiveDate: "Not applicable",
    certificateLimitation: "Not applicable",
    proceedingName: "Description of proceeding",
    proceedingDescription: "Description of proceeding",
    categoryOfLaw: "INQUESTS",
    currentProceedingStatus: "Live",
    dateWorkCanCommence: "2026-05-21T08:46:36.793278",
    proceedingEndDate: "Not applicable",
    clientInvolvementType: "Applicant",
    levelOfService: "FULL_REPRESENTATION",
    dateCurrentLevelOfServiceEffective: "2026-05-21T08:46:36.793278",
    previousLevelOfService: "Not applicable",
    datePreviousLevelOfServiceEffective: "Not applicable",
    scopeLimitationHeading: "FINAL_HEARING",
    scopeLimitationDescription: "This is the scope description",
  };

  let useCase: BuildCertificateViewUseCase;
  let applicationPortStub: StubbedInstance<ApplicationPort>;

  beforeEach(() => {
    applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getCertificateDetails.resolves({
      status: "SUCCESS",
      data: certificateDetails,
    });
    useCase = new BuildCertificateViewUseCase(applicationPortStub);
  });

  it("should return SUCCESS and certificate details when given a valid applicationId", async () => {
    const result = await useCase.execute({
      applicationId: "1",
      accessToken: "access-token-123",
    });
    assert.equal(result.status, "SUCCESS");

    assert.deepEqual(result.data, certificateDetails);
  });

  it("should call the applicationPort.getCertificateDetails method with the correct applicationId", async () => {
    await useCase.execute({
      applicationId: "1",
      accessToken: "access-token-123",
    });
    assert.equal(applicationPortStub.getCertificateDetails.calledOnce, true);
    assert.deepEqual(
      applicationPortStub.getCertificateDetails.getCall(0).args,
      ["1", "access-token-123"],
    );
  });

  it("returns TECHNICAL_FAILURE when applicationId is missing", async () => {
    const result = await useCase.execute({
      applicationId: "",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE);
    assert.equal(applicationPortStub.getCertificateDetails.called, false);
  });

  it("returns TECHNICAL_FAILURE with RESOURCE_NOT_FOUND when the certificate is not found", async () => {
    const cause = new Error("Certificate not found for application 1");
    applicationPortStub.getCertificateDetails.resolves({
      status: "FAILURE",
      reason: "RESOURCE_NOT_FOUND",
      message: "Certificate not found for application 1",
      cause,
    });

    const result = await useCase.execute({
      applicationId: "1",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.RESOURCE_NOT_FOUND);
    assert.equal(result.cause, cause);
  });

  it("returns TECHNICAL_FAILURE with UPSTREAM_REJECTED when the adaptor reports an upstream failure", async () => {
    const cause = new Error("Upstream error");
    applicationPortStub.getCertificateDetails.resolves({
      status: "FAILURE",
      reason: "UPSTREAM_REJECTED",
      cause,
    });

    const result = await useCase.execute({
      applicationId: "1",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED);
    assert.equal(result.cause, cause);
  });

  it("returns TECHNICAL_FAILURE when certificate retrieval throws", async () => {
    const error = new Error("Get certificate details failed");
    applicationPortStub.getCertificateDetails.rejects(error);

    const result = await useCase.execute({
      applicationId: "1",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED);
    assert.equal(result.cause, error);
  });
});
