import { strict as assert } from "assert";
import { StubbedInstance, stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("BuildCertificateViewUseCase", () => {
  const certificateDetails = {
    laaReference: "1",
    dateCreated: "2026-05-19",
    clientName: "John Doe",
    clientAddress: {
      addressLine1: "1 Test Road",
      addressLine2: null,
      townOrCity: "London",
      county: null,
      postcode: "SW1A 1AA",
    },
    firmName: "Test Solicitors",
    officeAddress: {
      addressLine1: "Test Office Address",
      addressLine2: null,
      townOrCity: "London",
      county: null,
      postcode: "SW1A 1AA",
    },
    opponentDetails: ["Cabinet Office"],
    guardianName: "Not applicable",
    guardianAddress: "Not applicable",
    certificateType: "SUBSTANTIVE",
    status: "Live",
    effectiveDate: "2026-05-21",
    endDate: "Not applicable",
    reinstatementDate: "Not applicable",
    costLimitation: 10000,
    costLimitationEffectiveDate: "Not applicable",
    certificateLimitation: "Not applicable",
    proceedingName: "Description of proceeding",
    proceedingDescription: "Description of proceeding",
    categoryOfLaw: "INQUESTS",
    currentProceedingStatus: "Live",
    dateWorkCanCommence: "2026-05-21",
    proceedingEndDate: "Not applicable",
    clientInvolvementType: "Applicant",
    levelOfService: "FULL_REPRESENTATION",
    dateCurrentLevelOfServiceEffective: "2026-05-21",
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

  it("should return SUCCESS and certificate details when given a valid laaReference", async () => {
    const result = await useCase.execute({
      laaReference: "1",
      accessToken: "access-token-123",
    });
    assert.equal(result.status, "SUCCESS");

    assert.deepEqual(result.data, certificateDetails);
  });

  it("should call the applicationPort.getCertificateDetails method with the correct laaReference", async () => {
    await useCase.execute({
      laaReference: "1",
      accessToken: "access-token-123",
    });
    assert.equal(applicationPortStub.getCertificateDetails.calledOnce, true);
    assert.deepEqual(
      applicationPortStub.getCertificateDetails.getCall(0).args,
      ["1", "access-token-123"],
    );
  });

  it("returns INVALID_INPUT when laaReference is missing", async () => {
    const result = await useCase.execute({
      laaReference: "",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
    assert.equal(applicationPortStub.getCertificateDetails.called, false);
  });

  it("returns NOT_FOUND when the certificate does not exist", async () => {
    applicationPortStub.getCertificateDetails.resolves(undefined);

    const result = await useCase.execute({
      laaReference: "1",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "NOT_FOUND" });
  });

  it("propagates unexpected port errors unchanged", async () => {
    const cause = new Error("Upstream error");
    applicationPortStub.getCertificateDetails.rejects(cause);

    await assert.rejects(
      useCase.execute({
        laaReference: "1",
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === cause,
    );
  });

  it("propagates application errors from the port unchanged", async () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_certificate",
      true,
    );
    applicationPortStub.getCertificateDetails.rejects(error);

    await assert.rejects(
      useCase.execute({
        laaReference: "1",
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
