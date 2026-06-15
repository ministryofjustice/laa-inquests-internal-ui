import { strict as assert } from "assert";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";

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

  it("returns SUCCESS with mapped presentation fields", () => {
    const result = useCase.execute(application);

    assert.equal(result.status, "SUCCESS");
    assert.equal(
      result.data.application.applicationType,
      "Initial application",
    );
    assert.equal(result.data.proceedings[0].certificateType, "Substantive");
    assert.equal(
      result.data.proceedings[0].substantiveCostLimitation,
      "£25,000",
    );
    assert.equal(
      result.data.clientCorrespondenceAddressDisplay,
      "1 High Street<br>London<br>Greater London<br>SW1A 1AA",
    );
    assert.deepEqual(result.data.statusTag, {
      text: "Awaiting assessment",
      classes: "govuk-tag--grey",
    });
    assert.deepEqual(result.data.warnings, []);
  });

  it("returns warning when specified correspondence address is missing", () => {
    const result = useCase.execute({
      ...application,
      client: {
        ...application.client,
        correspondenceAddressSource: "USE_SPECIFIED_ADDRESS",
        correspondenceAddress: null,
      },
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(
      result.data.clientCorrespondenceAddressDisplay,
      "Not provided",
    );
    assert.equal(result.data.warnings.length, 1);
  });
});
