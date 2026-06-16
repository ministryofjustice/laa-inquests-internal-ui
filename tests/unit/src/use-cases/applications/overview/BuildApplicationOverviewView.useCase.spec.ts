import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("BuildApplicationOverviewViewUseCase", () => {
  const useCase = new BuildApplicationOverviewViewUseCase();

  const application = {
    laaReference: 123,
    createdAt: "2026-05-21T08:46:36.793278",
    updatedAt: "2026-05-21T08:46:36.793294",
    status: "LIVE",
    usedDelegatedFunctions: true,
    applicationType: "INITIAL",
    autoGrant: true,
    overallDecision: "PENDING",
    proceedings: [
      {
        proceedingId: "MN035",
        proceedingDescription: "description of proceeding",
        categoryOfLaw: "INQUESTS",
        certificateType: "SUBSTANTIVE",
        levelOfService: "FULL_REPRESENTATION",
        matterType: "INQUESTS",
        scopeLimitationHeading: "FINAL_HEARING",
        scopeDescription: "This is the scope description",
        substantiveCostLimitation: 25000,
        clientInvolvementType: "RESPONDENT",
        meritsDecision: "PENDING",
      },
    ],
    publicBodies: [
      {
        publicBodyId: "Cabinet Office",
        publicBodyDescription: "Cabinet Office",
      },
    ],
    correspondenceRecipient: null,
    client: {
      clientId: 51,
      clientFirstName: "test",
      clientLastName: "test",
      clientLastNameAtBirth: "",
      dateOfBirth: "01-02-1990",
      nationalInsuranceNumber: "QQ123456C",
      correspondenceAddressSource: "USE_CLIENT_HOME_ADDRESS",
      correspondenceAddress: null,
      homeAddress: {
        addressLine1: "1 High Street",
        addressLine2: null,
        townOrCity: "London",
        county: "Greater London",
        postcode: "SW1A 1AA",
      },
      hasAppliedPreviously: false,
      prevApplicationReference: null,
      hasNoFixedAbode: false,
      isClientCorrespondenceRecipient: true,
    },
    deceased: {
      deceasedId: 51,
      deceasedFirstName: "test example",
      deceasedLastName: "test",
      deceasedDateOfBirth: "01-02-1990",
      deceasedDateOfDeath: "01-02-2003",
      coronersReference: "3452423",
      furtherInformation: "",
      clientRelationshipToDeceased: "brother",
    },
  } as any;

  it("returns SUCCESS with application data from the source port", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getApplication.resolves(application as any);

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.application, application);
    assert.equal(applicationPortStub.getApplication.callCount, 1);
    assert.deepEqual(applicationPortStub.getApplication.getCall(0).args, [
      "123",
    ]);
  });

  it("returns TECHNICAL_FAILURE when input is incomplete", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns TECHNICAL_FAILURE when source retrieval fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getApplication.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
