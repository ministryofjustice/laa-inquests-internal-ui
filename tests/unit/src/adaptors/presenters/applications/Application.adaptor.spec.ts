import { strict as assert } from "assert";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("Application adaptor", () => {
  let applicationAdaptor: ApplicationAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let viewApplicationAdaptorStub: StubbedInstance<ApplicationPort>;

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
    provider: {
      firmName: "Test Firm Ltd",
      accountNumber: "0KA123",
      emailAddress: "testfirm@example.com",
    },
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
  };

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    viewApplicationAdaptorStub = stubInterface<ApplicationPort>();
    applicationAdaptor = new ApplicationAdaptor(viewApplicationAdaptorStub);
  });

  it("render application overview page", async () => {
    viewApplicationAdaptorStub.getApplication.resolves(application);
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    assert.equal(responseStub.render.callCount, 1);
    const renderArgs = responseStub.render.getCall(0).args;
    assert.equal(renderArgs[0], "application/application-overview");
  });

  it("render application overview page passes application data and proceedings", async () => {
    viewApplicationAdaptorStub.getApplication.resolves(application);
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    assert.equal(responseStub.render.callCount, 1);
    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      application: {
        laaReference: 123,
        applicationType: "Initial application",
      },
      proceedings: [
        {
          proceedingDescription: "description of proceeding",
          certificateType: "Substantive",
          clientInvolvementType: "Respondent",
          levelOfService: "Full representation",
          substantiveCostLimitation: "£25,000",
        },
      ],
      backUrl: "#",
    });
  });

  it("render application overview page passes people tab data", async () => {
    viewApplicationAdaptorStub.getApplication.resolves(application);
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      application: {
        client: {
          clientFirstName: "test",
          clientLastName: "test",
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
        },
        deceased: {
          deceasedFirstName: "test example",
          deceasedLastName: "test",
          deceasedDateOfBirth: "01-02-1990",
          deceasedDateOfDeath: "01-02-2003",
          coronersReference: "3452423",
          furtherInformation: "",
          clientRelationshipToDeceased: "brother",
        },
        publicBodies: [
          {
            publicBodyId: "Cabinet Office",
            publicBodyDescription: "Cabinet Office",
          },
        ],
        provider: {
          firmName: "Test Firm Ltd",
          accountNumber: "0KA123",
          emailAddress: "testfirm@example.com",
        },
      },
      clientHomeAddressDisplay:
        "1 High Street<br>London<br>Greater London<br>SW1A 1AA",
      clientCorrespondenceAddressDisplay:
        "1 High Street<br>London<br>Greater London<br>SW1A 1AA",
    });
  });

  it("uses provider office placeholder when correspondence source is USE_PROVIDER_ADDRESS", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      client: {
        ...application.client,
        correspondenceAddressSource: "USE_PROVIDER_ADDRESS",
      },
    });

    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );

    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      clientCorrespondenceAddressDisplay: "Provider office address",
    });
  });

  it("renders specified correspondence address and care of recipient details", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      correspondenceRecipient: {
        recipientType: "Solicitor",
        recipientName: "Alex Jones",
      },
      client: {
        ...application.client,
        correspondenceAddressSource: "USE_SPECIFIED_ADDRESS",
        correspondenceAddress: {
          addressLine1: "2 Station Road",
          addressLine2: "Suite 5",
          townOrCity: "Leeds",
          county: null,
          postcode: "LS1 1AA",
        },
      },
    });

    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );

    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      clientCorrespondenceAddressDisplay:
        "2 Station Road<br>Suite 5<br>Leeds<br>LS1 1AA",
      careOfRecipientDisplay: "Solicitor<br>Alex Jones",
    });
  });
  it("renders No fixed abode when hasNoFixedAbode is true", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      client: {
        ...application.client,
        hasNoFixedAbode: true,
        correspondenceAddressSource: "USE_PROVIDER_ADDRESS",
      },
    });

    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );

    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      clientHomeAddressDisplay: "No fixed abode",
      clientCorrespondenceAddressDisplay: "Provider office address",
    });
  });

  it("renders null provider safely without throwing", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      provider: null,
    });
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      application: { provider: null },
    });
  });

  it("renders grey 'Awaiting assessment' tag when overallDecision is PENDING", async () => {
    viewApplicationAdaptorStub.getApplication.resolves(application);
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      statusTag: { text: "Awaiting assessment", classes: "govuk-tag--grey" },
    });
  });

  it("renders green 'Assessment complete' tag when overallDecision is not PENDING", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      overallDecision: "GRANTED",
    });
    await applicationAdaptor.renderApplicationPage(
      requestStub,
      responseStub,
      "123",
    );
    const renderArgs = responseStub.render.getCall(0).args;
    assert.partialDeepStrictEqual(renderArgs[1], {
      statusTag: { text: "Assessment complete", classes: "govuk-tag--green" },
    });
  });
});
