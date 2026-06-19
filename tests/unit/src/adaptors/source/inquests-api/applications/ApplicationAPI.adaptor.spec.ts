import sinon from "sinon";
import axios from "axios";
import { assert } from "chai";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import type {
  Application,
  ApplicationSummary,
} from "#src/adaptors/models/application.types.js";

const axiosGetStub = sinon.stub(axios, "get");
const axiosPatchStub = sinon.stub(axios, "patch");

afterEach(() => {
  axiosGetStub.reset();
  axiosPatchStub.reset();
});

const expectedApplication = {
  laaReference: 1,
  createdAt: "2026-05-18T15:49:07.455255",
  updatedAt: "2026-05-18T15:49:07.455279",
  status: "LIVE",
  usedDelegatedFunctions: true,
  applicationType: "INITIAL",
  autoGrant: true,
  overallDecision: "PENDING",
  proceedings: [
    {
      proceedingId: "PC049",
      proceedingDescription: "CAPA",
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
      publicBodyId: "Department for Transport",
      publicBodyDescription: "Department for Transport",
    },
  ],
  provider: {
    firmName: "Test Firm Ltd",
    accountNumber: "0KA123",
    emailAddress: "testfirm@example.com",
  },
  correspondenceRecipient: null,
  client: {
    clientId: 1,
    clientFirstName: "test",
    clientLastName: "surname",
    clientLastNameAtBirth: "Last name at birth",
    dateOfBirth: "01-01-1990",
    nationalInsuranceNumber: "PC123456C",
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
    deceasedId: 1,
    deceasedFirstName: "bob",
    deceasedLastName: "boberton",
    deceasedDateOfBirth: "01-01-2000",
    deceasedDateOfDeath: "01-01-2025",
    coronersReference: "123456",
    furtherInformation: "test information",
    clientRelationshipToDeceased: "guardian",
  },
};

const expectedApplicationsSummary = [
  {
    laa_reference: 1,
    created_at: "2026-05-18T15:49:07.455255",
    status: "LIVE",
    overall_decision: "PENDING",
  },
  {
    laa_reference: 2,
    created_at: "2026-05-19T15:49:07.455255",
    status: "LIVE",
    overall_decision: "GRANTED",
  },
];

describe("Test Application API Adaptor", () => {
  it("Test get All Applications calls axios", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplicationsSummary,
    });

    await adaptor.getAllApplications();

    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/applications/`);
  });

  it("Test get All Applications returns parsed application summary data", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplicationsSummary,
    });

    const applications: ApplicationSummary[] =
      await adaptor.getAllApplications();
    assert.deepEqual(applications, [
      {
        laaReference: 1,
        createdAt: "2026-05-18T15:49:07.455255",
        status: "LIVE",
        overallDecision: "PENDING",
      },
      {
        laaReference: 2,
        createdAt: "2026-05-19T15:49:07.455255",
        status: "LIVE",
        overallDecision: "GRANTED",
      },
    ]);
  });

  it("Test get Application calls axios", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

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
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplication,
    });

    const application: Application = await adaptor.getApplication("123");
    assert.deepEqual(expectedApplication, application);
  });

  it("accepts null provider firmName without throwing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: {
        ...expectedApplication,
        provider: {
          ...expectedApplication.provider,
          firmName: null,
        },
      },
    });

    const application: Application = await adaptor.getApplication("123");
    assert.isNull(application.provider?.firmName);
  });
});

describe("Test submitMeritsDecision", () => {
  it("calls the patch endpoint with the correct URL and payload for GRANTED decision", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.submitMeritsDecision("123", "GRANTED");

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/merits-decision`,
      { meritsDecision: "GRANTED" },
    );
  });

  it("calls the patch endpoint with the correct URL and payload for REFUSED decision", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.submitMeritsDecision("123", "REFUSED", {
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
    });

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/merits-decision`,
      {
        meritsDecision: "REFUSED",
        refusalReason: "NOT_IN_SCOPE",
        justification: "This case is not in scope",
      },
    );
  });

  it("does not include refusalReason and justification when decision is not REFUSED", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.submitMeritsDecision("123", "GRANTED", {
      refusalReason: "",
      justification: "Should not be sent",
    });

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/merits-decision`,
      { meritsDecision: "GRANTED" },
    );
  });
});
