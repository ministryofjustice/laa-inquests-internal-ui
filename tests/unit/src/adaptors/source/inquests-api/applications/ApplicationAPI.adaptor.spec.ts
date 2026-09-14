import sinon from "sinon";
import axios from "axios";
import { assert } from "chai";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import type {
  Application,
  ApplicationSummary,
  Certificate,
} from "#src/adaptors/models/application.types.js";
import {
  APPLICATION_STATUSES,
  GRANTED_DECISION,
} from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

const LIVE_STATUS = "LIVE";

const axiosGetStub = sinon.stub();
const axiosPatchStub = sinon.stub();
const axiosPostStub = sinon.stub();

afterEach(() => {
  axiosGetStub.reset();
  axiosPatchStub.reset();
  axiosPostStub.reset();
});

const expectedApplication: Application = {
  laaReference: "1",
  createdAt: "2026-05-18T15:49:07.455255",
  updatedAt: "2026-05-18T15:49:07.455279",
  status: APPLICATION_STATUSES.LIVE,
  usedDelegatedFunctions: true,
  applicationType: "INITIAL",
  autoGrant: true,
  overallDecision: "PENDING",
  proceeding: {
    proceedingId: "IQPC",
    proceedingName: "Death in police custody",
    proceedingDescription: "Death in police custody",
    categoryOfLaw: "INQUESTS",
    certificateType: "SUBSTANTIVE",
    levelOfService: "FULL_REPRESENTATION",
    matterType: "INQUESTS",
    scopeLimitationHeading: "FINAL_HEARING",
    scopeDescription: "This is the scope description",
    substantiveCostLimitation: 10000,
    clientInvolvementType: "RESPONDENT",
    meritsDecision: "PENDING",
  },
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
  coronersLetter: {
    fileName: "test-document.pdf",
  },
};

const expectedApplicationsSummary = [
  {
    laa_reference: "1",
    created_at: "2026-05-18T15:49:07.455255",
    status: LIVE_STATUS,
    overall_decision: "PENDING",
  },
  {
    laa_reference: "2",
    created_at: "2026-05-19T15:49:07.455255",
    status: LIVE_STATUS,
    overall_decision: GRANTED_DECISION,
  },
];

const expectedCertificate: Certificate = {
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
  status: APPLICATION_STATUSES.LIVE,
  effectiveDate: "2026-05-21",
  endDate: "Not applicable",
  reinstatementDate: "Not applicable",
  costLimitation: 10000,
  costLimitationEffectiveDate: "Not applicable",
  certificateLimitation: "Not applicable",
  proceedingName: "Description of proceeding",
  proceedingDescription: "Description of proceeding",
  categoryOfLaw: "INQUESTS",
  currentProceedingStatus: APPLICATION_STATUSES.LIVE,
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

describe("Application API access token enforcement", () => {
  const operations = [
    {
      name: "get_application",
      execute: (adaptor: ApplicationAPIAdaptor) =>
        adaptor.getApplication("123", undefined),
    },
    {
      name: "get_application_history",
      execute: (adaptor: ApplicationAPIAdaptor) =>
        adaptor.getApplicationHistory("123", undefined),
    },
    {
      name: "get_coroners_letter",
      execute: (adaptor: ApplicationAPIAdaptor) =>
        adaptor.getCoronersLetterDocument("123", undefined),
    },
  ];

  for (const operation of operations) {
    it(`throws before Axios when ${operation.name} has no access token`, async () => {
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ApplicationAPIAdaptor(fakeAxios, "https://localhost");
      let thrown: unknown;

      try {
        await operation.execute(adaptor);
      } catch (error) {
        thrown = error;
      }

      assert.equal(axiosGetStub.callCount, 0);
      assert.instanceOf(thrown, ApplicationError);
      if (thrown instanceof ApplicationError) {
        assert.equal(
          thrown.type,
          APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        );
        assert.equal(thrown.operation, operation.name);
        assert.equal(thrown.retryable, false);
        assert.equal(thrown.cause, undefined);
      }
    });
  }
});

describe("Test Application API Adaptor", () => {
  it("Test get All Applications calls axios", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplicationsSummary,
    });

    await adaptor.getAllApplications("access-token-123");

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
      await adaptor.getAllApplications("access-token-123");
    assert.deepEqual(applications, [
      {
        laaReference: "1",
        createdAt: "2026-05-18T15:49:07.455255",
        status: APPLICATION_STATUSES.LIVE,
        overallDecision: "PENDING",
      },
      {
        laaReference: "2",
        createdAt: "2026-05-19T15:49:07.455255",
        status: APPLICATION_STATUSES.LIVE,
        overallDecision: GRANTED_DECISION,
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
    await adaptor.getApplication("123", "access-token-123");
    assert(axiosGetStub.calledOnce);
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/applications/123`);

    await adaptor.getApplication("234", "access-token-123");
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/applications/234`);
  });

  it("Test get Applications calls returns application data", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplication,
    });

    const application: Application = await adaptor.getApplication(
      "123",
      "access-token-123",
    );
    assert.deepEqual(expectedApplication, application);
  });

  it("throws a sanitized retryable error when application retrieval returns 500", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const serverError = new axios.AxiosError(
      "Server Error",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 500 } as any,
    );
    axiosGetStub.rejects(serverError);

    let thrown: unknown;
    try {
      await adaptor.getApplication("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
      assert.equal(thrown.operation, "get_application");
      assert.equal(thrown.retryable, true);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized invalid-response error without logging success for malformed application data", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logInfoStub = sinon.stub(logger, "logInfo");
    axiosGetStub.resolves({ data: { laaReference: "123" } });

    let thrown: unknown;
    try {
      await adaptor.getApplication("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
      );
      assert.equal(thrown.operation, "get_application");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
    sinon.assert.notCalled(logInfoStub);
    logInfoStub.restore();
  });

  it("throws a sanitized authentication error when application retrieval returns 401", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Unauthorised",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 401 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getApplication("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      );
      assert.equal(thrown.operation, "get_application");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized forbidden error when application retrieval returns 403", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Forbidden",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 403 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getApplication("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.FORBIDDEN);
      assert.equal(thrown.operation, "get_application");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
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

    const application: Application = await adaptor.getApplication(
      "123",
      "access-token-123",
    );
    assert.isNull(application.provider?.firmName);
  });
});

describe("Test getCoronersLetterDocument", () => {
  it("calls axios.get with correct URL and responseType arraybuffer", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("fake image data");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "image/jpeg" },
    });

    await adaptor.getCoronersLetterDocument("123", "access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(
      axiosGetStub,
      `${baseUrl}/applications/123/coroners-letter`,
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: "Bearer access-token-123",
        },
      },
    );
  });

  it("returns buffer and content-type from API response", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("fake image data");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "image/jpeg" },
    });

    const result = await adaptor.getCoronersLetterDocument(
      "123",
      "access-token-123",
    );

    assert.isDefined(result);
    if (result === undefined) {
      return;
    }
    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "image/jpeg");
  });

  it("defaults to application/octet-stream when content-type header is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("fake document data");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: {},
    });

    const result = await adaptor.getCoronersLetterDocument(
      "456",
      "access-token-123",
    );

    assert.isDefined(result);
    if (result === undefined) {
      return;
    }
    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "application/octet-stream");
  });

  it("returns undefined when the coroner letter does not exist", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Not Found",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 404 } as any,
      ),
    );

    const result = await adaptor.getCoronersLetterDocument(
      "123",
      "access-token-123",
    );

    assert.equal(result, undefined);
  });

  it("throws a sanitized authentication error when coroner letter retrieval returns 401", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Unauthorised",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 401 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getCoronersLetterDocument("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      );
      assert.equal(thrown.operation, "get_coroners_letter");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized forbidden error when coroner letter retrieval returns 403", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Forbidden",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 403 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getCoronersLetterDocument("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.FORBIDDEN);
      assert.equal(thrown.operation, "get_coroners_letter");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("logs once and throws a sanitized retryable error when coroner letter retrieval returns 500", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logErrorStub = sinon.stub(logger, "logError");
    const serverError = new axios.AxiosError(
      "Server Error",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 500 } as any,
    );
    axiosGetStub.rejects(serverError);

    let thrown: unknown;
    try {
      await adaptor.getCoronersLetterDocument("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
      assert.equal(thrown.operation, "get_coroners_letter");
      assert.equal(thrown.retryable, true);
      assert.equal(thrown.cause, undefined);
    }
    sinon.assert.calledOnce(logErrorStub);
    const logInput = logErrorStub.firstCall.args[0];
    assert.deepInclude(logInput.extraContext, {
      event: "outbound_api_request_failed",
      operation: "get_coroners_letter",
      upstream_method: "GET",
      upstream_route: "/applications/:id/coroners-letter",
      upstream_status_code: 500,
      failure_reason: "upstream_5xx",
      retryable: true,
      laa_reference: "123",
    });
    assert.notProperty(logInput.extraContext, "body");
    assert.notProperty(logInput.extraContext, "response");
    logErrorStub.restore();
  });
});

describe("Test getCertificateDetails", () => {
  it("calls axios.get with the correct URL and Authorization header", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedCertificate,
    });

    await adaptor.getCertificateDetails("123", "access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(
      axiosGetStub,
      `${baseUrl}/applications/123/certificate`,
      {
        headers: {
          Authorization: "Bearer access-token-123",
        },
      },
    );
  });

  it("returns parsed certificate details", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedCertificate,
    });

    const result = await adaptor.getCertificateDetails(
      "123",
      "access-token-123",
    );

    assert.deepEqual(result, expectedCertificate);
  });

  it("throws a sanitized invalid-response error when certificate data is malformed", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.resolves({
      data: { laaReference: "123" },
    });

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
      );
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("returns undefined when the certificate does not exist", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    const notFoundError = new axios.AxiosError(
      "Not Found",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      { status: 404 } as any,
    );
    axiosGetStub.rejects(notFoundError);

    const result = await adaptor.getCertificateDetails(
      "123",
      "access-token-123",
    );

    assert.equal(result, undefined);
  });

  it("logs expected certificate absence once with safe operation metadata", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logWarnStub = sinon.stub(logger, "logWarn");
    const notFoundError = new axios.AxiosError(
      "Not Found",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      { status: 404 } as any,
    );
    axiosGetStub.rejects(notFoundError);

    await adaptor.getCertificateDetails("123", "access-token-123");

    sinon.assert.calledOnce(logWarnStub);
    assert.deepInclude(logWarnStub.firstCall.args[0], {
      functionName: "application_api_adaptor",
      message: "Certificate not found upstream",
    });
    const { extraContext } = logWarnStub.firstCall.args[0];
    assert.isDefined(extraContext);
    if (extraContext !== undefined) {
      assert.deepInclude(extraContext, {
        event: "outbound_api_not_found",
        operation: "get_certificate",
        upstream_method: "GET",
        upstream_route: "/applications/:id/certificate",
        upstream_status_code: 404,
        laa_reference: "123",
      });
      assert.isNumber(extraContext.duration_ms);
    }
    logWarnStub.restore();
  });

  it("throws a sanitized authentication error when the API responds with 401", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const unauthorisedError = new axios.AxiosError(
      "Unauthorised",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      { status: 401 } as any,
    );
    axiosGetStub.rejects(unauthorisedError);

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      );
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized forbidden error when the API responds with 403", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const forbiddenError = new axios.AxiosError(
      "Forbidden",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      { status: 403 } as any,
    );
    axiosGetStub.rejects(forbiddenError);

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.FORBIDDEN);
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized retryable error when the API responds with 500", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logErrorStub = sinon.stub(logger, "logError");

    const serverError = new axios.AxiosError(
      "Server Error",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 500 } as any,
    );
    axiosGetStub.rejects(serverError);

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, true);
      assert.equal(thrown.cause, undefined);
    }

    sinon.assert.calledOnce(logErrorStub);
    const logInput = logErrorStub.firstCall.args[0];
    assert.deepInclude(logInput, {
      functionName: "application_api_adaptor",
      message: "Certificate request failed",
      err: serverError,
    });
    assert.isDefined(logInput.extraContext);
    if (logInput.extraContext !== undefined) {
      assert.deepInclude(logInput.extraContext, {
        event: "outbound_api_request_failed",
        operation: "get_certificate",
        upstream_method: "GET",
        upstream_route: "/applications/:id/certificate",
        upstream_status_code: 500,
        failure_reason: "upstream_5xx",
        retryable: true,
        laa_reference: "123",
      });
      assert.notProperty(logInput.extraContext, "authorization");
      assert.notProperty(logInput.extraContext, "body");
      assert.notProperty(logInput.extraContext, "response");
    }
    logErrorStub.restore();
  });

  it("throws a sanitized retryable error when no response is received", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    const networkError = new axios.AxiosError("Network Error", "ERR_NETWORK");
    axiosGetStub.rejects(networkError);

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, true);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized authentication error without calling Axios when the access token is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);

    let thrown: unknown;
    try {
      await adaptor.getCertificateDetails("123", undefined);
    } catch (error) {
      thrown = error;
    }

    assert.equal(axiosGetStub.callCount, 0);
    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      );
      assert.equal(thrown.operation, "get_certificate");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });
});

describe("Test getApplicationHistory", () => {
  it("throws a sanitized authentication error when history retrieval returns 401", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Unauthorised",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 401 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getApplicationHistory("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      );
      assert.equal(thrown.operation, "get_application_history");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("throws a sanitized forbidden error when history retrieval returns 403", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosGetStub.rejects(
      new axios.AxiosError(
        "Forbidden",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 403 } as any,
      ),
    );

    let thrown: unknown;
    try {
      await adaptor.getApplicationHistory("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.FORBIDDEN);
      assert.equal(thrown.operation, "get_application_history");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
  });

  it("logs once and throws a sanitized retryable error when history retrieval returns 500", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logErrorStub = sinon.stub(logger, "logError");
    const serverError = new axios.AxiosError(
      "Server Error",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 500 } as any,
    );
    axiosGetStub.rejects(serverError);

    let thrown: unknown;
    try {
      await adaptor.getApplicationHistory("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(thrown.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
      assert.equal(thrown.operation, "get_application_history");
      assert.equal(thrown.retryable, true);
      assert.equal(thrown.cause, undefined);
    }
    sinon.assert.calledOnce(logErrorStub);
    const logInput = logErrorStub.firstCall.args[0];
    assert.deepInclude(logInput.extraContext, {
      event: "outbound_api_request_failed",
      operation: "get_application_history",
      upstream_method: "GET",
      upstream_route: "/applications/:id/history",
      upstream_status_code: 500,
      failure_reason: "upstream_5xx",
      retryable: true,
      laa_reference: "123",
    });
    assert.notProperty(logInput.extraContext, "body");
    assert.notProperty(logInput.extraContext, "response");
    logErrorStub.restore();
  });

  it("throws a sanitized invalid-response error without logging history success", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const logInfoStub = sinon.stub(logger, "logInfo");
    axiosGetStub.resolves({ data: [{ timestamp: "2026-09-09" }] });

    let thrown: unknown;
    try {
      await adaptor.getApplicationHistory("123", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, ApplicationError);
    if (thrown instanceof ApplicationError) {
      assert.equal(
        thrown.type,
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
      );
      assert.equal(thrown.operation, "get_application_history");
      assert.equal(thrown.retryable, false);
      assert.equal(thrown.cause, undefined);
    }
    sinon.assert.notCalled(logInfoStub);
    logInfoStub.restore();
  });
});

describe("Test submitRefuseDecision", () => {
  it("calls the refused endpoint with the correct variables", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.submitRefuseDecision(
      "123",
      "access-token-123",
      "not-in-scope",
      "This case is not in scope",
    );

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/refuse-decision`,
      {
        reasonForRefusal: "NOT_IN_SCOPE",
        justification: "This case is not in scope",
      },
    );
  });
});

describe("Test submitGrantDecision", () => {
  it("calls the grant endpoint correctly with the correct variables", async () => {
    const baseUrl = "http://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.submitGrantDecision("123", "access-token-123", "2000-01-01");

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/grant-decision`,
      {
        certificateStartDate: "2000-01-01",
      },
    );
  });
});

describe("getPublicBodies", () => {
  it("calls the public bodies reference data endpoint and returns parsed data", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    const expectedPublicBodies = [
      {
        publicBodyId: "Attorney General's Office",
        publicBodyDescription: "Attorney General's Office",
      },
      {
        publicBodyId: "Cabinet Office",
        publicBodyDescription: "Cabinet Office",
      },
      {
        publicBodyId: "Department for Transport",
        publicBodyDescription: "Department for Transport",
      },
    ];

    axiosGetStub.resolves({ data: expectedPublicBodies });

    const publicBodies = await adaptor.getPublicBodies("access-token-123");

    sinon.assert.calledWith(
      axiosGetStub,
      `${baseUrl}/applications/public-bodies`,
    );
    assert.deepEqual(publicBodies, expectedPublicBodies);
  });
});

describe("updateApplicationPublicBodies", () => {
  it("calls the update endpoint with the selected public body ids", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { patch: axiosPatchStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPatchStub.resolves({});

    await adaptor.updateApplicationPublicBodies("123", "access-token-123", [
      "Cabinet Office",
      "Department for Transport",
    ]);

    sinon.assert.calledOnce(axiosPatchStub);
    sinon.assert.calledWith(
      axiosPatchStub,
      `${baseUrl}/applications/123/public-bodies`,
      {
        publicBodies: ["Cabinet Office", "Department for Transport"],
      },
    );
  });
});

describe("addHistoryNote", () => {
  it("calls the history note endpoint with the correct payload", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { post: axiosPostStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPostStub.resolves({});

    await adaptor.addHistoryNote(
      "123",
      "access-token-123",
      "This is a case note",
    );

    sinon.assert.calledOnce(axiosPostStub);
    sinon.assert.calledWith(axiosPostStub, `${baseUrl}/applications/123/note`, {
      noteText: "This is a case note",
    });
  });

  it("throws when the API request fails", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { post: axiosPostStub } as any;
    const adaptor = new ApplicationAPIAdaptor(fakeAxios, baseUrl);
    axiosPostStub.rejects(new Error("Network error"));

    try {
      await adaptor.addHistoryNote("123", "access-token-123", "A note");
      assert.fail("Expected an error to be thrown");
    } catch (error) {
      assert.instanceOf(error, ApplicationError);
      assert.equal(
        (error as ApplicationError).type,
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      );
      assert.equal(
        (error as ApplicationError).operation,
        "/applications/123/note",
      );
    }
  });
});
