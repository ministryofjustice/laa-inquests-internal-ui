import sinon from "sinon";
import axios from "axios";
import { assert } from "chai";
import { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import { Application } from "#src/adaptors/models/application.types.js";

const axiosGetStub = sinon.stub(axios, "get");

afterEach(() => {
  axiosGetStub.reset();
});

const expectedApplication = {
      "laaReference": 1,
      "createdAt": "2026-05-18T15:49:07.455255",
      "updatedAt": "2026-05-18T15:49:07.455279",
      "status": "LIVE",
      "usedDelegatedFunctions": true,
      "applicationType": "INITIAL",
      "autoGrant": true,
      "overallDecision": "PENDING",
      "proceedings": [
        {
          "proceedingId": "PC049",
          "proceedingDescription": "CAPA",
          "categoryOfLaw": "INQUESTS",
          "certificateType": "SUBSTANTIVE",
          "levelOfService": "FULL_REPRESENTATION",
          "matterType": "INQUESTS",
          "scopeLimitationHeading": "FINAL_HEARING",
          "scopeDescription": "This is the scope description",
          "substantiveCostLimitation": 25000,
          "clientInvolvementType": "RESPONDENT",
          "meritsDecision": "PENDING"
        }
      ],
      "publicBodies": [
        {
          "publicBodyId": "Department for Transport",
          "publicBodyDescription": "Department for Transport"
        }
      ],
      "client": {
        "clientId": 1,
        "clientFirstName": "test",
        "clientLastName": "surname",
        "clientLastNameAtBirth": "Last name at birth",
        "dateOfBirth": "01-01-1990",
        "nationalInsuranceNumber": "PC123456C",
        "correspondenceAddress": null,
        "homeAddress": null,
        "hasAppliedPreviously": false,
        "prevApplicationReference": null
      },
      "deceased": {
        "deceasedId": 1,
        "deceasedFirstName": "bob",
        "deceasedLastName": "boberton",
        "deceasedDateOfBirth": "01-01-2000",
        "deceasedDateOfDeath": "01-01-2025",
        "coronersReference": "123456",
        "furtherInformation": "test information",
        "clientRelationshipToDeceased": "guardian"
      }
    };

describe("Test Application API Adaptor", () => {
  it("Test get Application calls axios", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ViewApplicationAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplication,
    });
    await adaptor.getApplication("123");
    assert(axiosGetStub.calledOnce);
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/applications/123`);

    await adaptor.getApplication("234");
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/applications/234`);
  });

  it("Test get Applications calls returns application data", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ViewApplicationAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplication,
    });

    const application: Application = await adaptor.getApplication("123");
    assert.deepEqual(expectedApplication, application);
  });
});
