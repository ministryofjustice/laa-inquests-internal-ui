import { strict as assert } from "assert";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationAdaptor } from "#src/adaptors/Application.adaptor.js";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";

describe("Application adaptor", () => {
  let applicationAdaptor: ApplicationAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let viewApplicationAdaptorStub: StubbedInstance<ApplicationAPIAdaptor>;

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
    client: {
      clientId: 51,
      clientFirstName: "test",
      clientLastName: "test",
      clientLastNameAtBirth: "",
      dateOfBirth: "01-02-1990",
      nationalInsuranceNumber: "QQ123456C",
      correspondenceAddress: null,
      homeAddress: null,
      hasAppliedPreviously: false,
      prevApplicationReference: null,
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
    viewApplicationAdaptorStub = stubInterface<ApplicationAPIAdaptor>();
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
          correspondenceAddress: null,
          homeAddress: null,
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
      },
    });
  });

  it("renders grey 'Awaiting assessment' tag when meritsDecision is PENDING", async () => {
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

  it("renders green 'Assessment complete' tag when meritsDecision is not PENDING", async () => {
    viewApplicationAdaptorStub.getApplication.resolves({
      ...application,
      proceedings: [
        { ...application.proceedings[0], meritsDecision: "GRANTED" },
      ],
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
