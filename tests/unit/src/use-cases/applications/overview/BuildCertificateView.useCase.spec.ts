import { strict as assert } from "assert";
import { StubbedInstance, stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";

describe.only("BuildCertificateViewUseCase", () => {
  const certificateDetails = {
    clientName: "John Doe",
    clientAddress: "1 Test Road, London",
    firmName: "Test Solicitors",
    officeAddress: "Test Office Address, London",
    opponentDetails: ["Cabinet Office"],
    guardianName: "Not applicable",
    guardianAddress: "Not applicable",
    certificateType: "SUBSTANTIVE",
    status: "LIVE",
    effectiveDate: "2026-05-21T08:46:36.793278",
    endDate: "Not applicable",
    reinstatementDate: "Not applicable",
    costLimitation: "10000",
    costLimitationEffectiveDate: "Not applicable",
    certificateLimitation: "Not applicable",
    careOrderDescription: "Description of proceeding",
    categoryOfLaw: "INQUESTS",
    currentProceedingStatus: "LIVE",
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
    applicationPortStub.getCertificateDetails.resolves(certificateDetails);
    useCase = new BuildCertificateViewUseCase(applicationPortStub);
  });

  it("should return SUCCESS and certificate details when given a valid applicationId", async () => {
    const result = await useCase.execute({ applicationId: "1" });
    assert.equal(result.status, "SUCCESS");

    assert.deepEqual(result.data, certificateDetails);
  });

  it("should call the applicationPort.getCertificateDetails method with the correct applicationId", async () => {
    const result = await useCase.execute({ applicationId: "1" });
    assert.equal(applicationPortStub.getCertificateDetails.calledOnce, true);
    assert.deepEqual(
      applicationPortStub.getCertificateDetails.getCall(0).args,
      ["1"],
    );
  });
});
