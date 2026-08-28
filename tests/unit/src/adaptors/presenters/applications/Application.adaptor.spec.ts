import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  APPLICATION_STATUSES,
  GRANTED_DECISION,
} from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { BuildApplicationClaimsViewUseCase } from "#src/use-cases/applications/claims/BuildApplicationClaimsView.useCase.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";
import { AddHistoryNoteUseCase } from "#src/use-cases/applications/history/AddHistoryNote.useCase.js";
import { AddHistoryNoteValidator } from "#src/adaptors/presenter/applications/AddHistoryNote.validator.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

describe("Application adaptor", () => {
  let applicationAdaptor: ApplicationAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let viewApplicationAdaptorStub: StubbedInstance<ApplicationPort>;
  let claimsAdaptorStub: StubbedInstance<ClaimsPort>;
  let buildCertificateViewUseCaseStub: StubbedInstance<BuildCertificateViewUseCase>;
  let buildApplicationClaimsViewUseCaseStub: StubbedInstance<BuildApplicationClaimsViewUseCase>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let logInfoStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;

  const application = {
    laaReference: 123,
    createdAt: "2026-05-21T08:46:36.793278",
    updatedAt: "2026-05-21T08:46:36.793294",
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
    coronersLetter: {
      fileName: "test-document.pdf",
    },
  };

  const certificateDetails = {
    laaReference: 1,
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
    effectiveDate: "2025-09-05",
    endDate: "Not applicable",
    reinstatementDate: "Not applicable",
    costLimitation: 10000,
    costLimitationEffectiveDate: "Not applicable",
    certificateLimitation: "Not applicable",
    proceedingName: "Description of proceeding",
    proceedingDescription: "Description of proceeding",
    categoryOfLaw: "INQUESTS",
    currentProceedingStatus: APPLICATION_STATUSES.LIVE,
    dateWorkCanCommence: "2025-09-05",
    proceedingEndDate: "Not applicable",
    clientInvolvementType: "Applicant",
    levelOfService: "FULL_REPRESENTATION",
    dateCurrentLevelOfServiceEffective: "2025-09-05",
    previousLevelOfService: "Not applicable",
    datePreviousLevelOfServiceEffective: "Not applicable",
    scopeLimitationHeading: "FINAL_HEARING",
    scopeLimitationDescription: "This is the scope description",
  };

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    viewApplicationAdaptorStub = stubInterface<ApplicationPort>();
    claimsAdaptorStub = stubInterface<ClaimsPort>();
    buildCertificateViewUseCaseStub =
      stubInterface<BuildCertificateViewUseCase>();
    buildApplicationClaimsViewUseCaseStub =
      stubInterface<BuildApplicationClaimsViewUseCase>();
    logInfoStub = sinon.stub(logger, "logInfo");
    logErrorStub = sinon.stub(logger, "logError");
    buildCertificateViewUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: certificateDetails,
    });
    buildApplicationClaimsViewUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: {
        toBeAssessedClaims: [],
        assessedClaims: [],
        hasClaims: false,
        substantiveCertificate: 10000,
        totalRemaining: 10000,
      },
    });
    viewApplicationAdaptorStub.getApplicationHistory.resolves([]);
    applicationAdaptor = new ApplicationAdaptor(
      viewApplicationAdaptorStub,
      undefined,
      undefined,
      claimsAdaptorStub,
      buildApplicationClaimsViewUseCaseStub,
    );
    requestStub.session.user = {
      userId: "test-user-id",
      accessToken: "test-access-token",
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("renderApplicationPage", () => {
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
        proceeding: {
          proceedingName: "Death in police custody",
          certificateType: "Substantive",
          clientInvolvementType: "Respondent",
          levelOfService: "Full representation",
          substantiveCostLimitation: "£10,000",
        },
        backUrl: "/",
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

    it("renders fallback message when provider firmName is null", async () => {
      viewApplicationAdaptorStub.getApplication.resolves({
        ...application,
        provider: {
          ...application.provider,
          firmName: null,
        },
      });

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        application: {
          provider: {
            firmName:
              "Could not retrieve Provider details. Please try again later",
          },
        },
      });
    });

    it("renders fallback message when provider firmName is empty", async () => {
      viewApplicationAdaptorStub.getApplication.resolves({
        ...application,
        provider: {
          ...application.provider,
          firmName: "",
        },
      });

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        application: {
          provider: {
            firmName:
              "Could not retrieve Provider details. Please try again later",
          },
        },
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
        overallDecision: GRANTED_DECISION,
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

    it("passes coronersLetter fileName from the application response to the view", async () => {
      viewApplicationAdaptorStub.getApplication.resolves({
        ...application,
        coronersLetter: {
          fileName: "test-document.pdf",
        },
      });
      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );
      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        application: {
          coronersLetter: {
            fileName: "test-document.pdf",
          },
        },
      });
    });
  });

  describe("renderApplicationPage Claims tab", () => {
    const toBeAssessedClaim = {
      claimId: 10,
      claimTypeId: "PAYMENT_ON_ACCOUNT",
      submissionDate: "2026-08-10T13:37:56.629563",
      totalProfitCostNet: "1000.00",
      totalProfitCostGross: "1200.00",
      totalProfitCostVatZero: null,
      totalFundsRemainingAfterClaim: "8800.00",
      poaTypeId: "PROFIT_COST",
      statusId: "SUBMITTED",
      claimDecisionStatus: null,
    };

    const assessedClaim = {
      claimId: 20,
      claimTypeId: "PAYMENT_ON_ACCOUNT",
      submissionDate: "2026-07-01T09:00:00.000000",
      totalProfitCostNet: "1600.00",
      totalProfitCostGross: "2000.00",
      totalProfitCostVatZero: null,
      totalFundsRemainingAfterClaim: "8000.00",
      poaTypeId: "PROFIT_COST",
      statusId: "PAY_IN_FULL",
      claimDecisionStatus: "PAY_IN_FULL",
    };

    it("passes the mapped claims view model to the view", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      buildApplicationClaimsViewUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: {
          toBeAssessedClaims: [toBeAssessedClaim],
          assessedClaims: [assessedClaim],
          hasClaims: true,
          substantiveCertificate: 10000,
          totalRemaining: 8000,
        },
      });

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        claims: {
          hasClaims: true,
          substantiveCertificate: "£10,000",
          totalRemaining: "£8,000",
          toBeAssessed: [
            {
              date: "10 August 2026",
              total: "£1,200",
              status: "Submitted",
              claimType: "Payment on account",
              href: "/applications/123/claims/10",
            },
          ],
          assessed: [
            {
              date: "01 July 2026",
              total: "£2,000",
              status: "Pay in full",
              claimType: "Payment on account",
              href: "/applications/123/claims/20",
            },
          ],
        },
      });
    });

    it("passes the substantive cost limitation to the claims use case", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      assert.equal(buildApplicationClaimsViewUseCaseStub.execute.callCount, 1);
      const executeArgs =
        buildApplicationClaimsViewUseCaseStub.execute.getCall(0).args[0];
      assert.equal(executeArgs.applicationId, "123");
      assert.equal(executeArgs.substantiveCertificate, 10000);
    });

    it("renders claims as unavailable when the claims use case fails", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      buildApplicationClaimsViewUseCaseStub.execute.resolves({
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
      });

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        claims: { unavailable: true },
      });
    });
  });

  describe("serveCoronersLetterDocument", () => {
    it("serveCoronersLetterDocument calls port and sends buffer with correct headers", async () => {
      const mockBuffer = Buffer.from("fake document data");
      viewApplicationAdaptorStub.getCoronersLetterDocument.resolves({
        data: mockBuffer,
        contentType: "image/jpeg",
      });

      await applicationAdaptor.serveCoronersLetterDocument(
        requestStub,
        responseStub,
        "123",
      );

      assert.equal(
        viewApplicationAdaptorStub.getCoronersLetterDocument.callCount,
        1,
      );
      assert.deepStrictEqual(
        viewApplicationAdaptorStub.getCoronersLetterDocument.getCall(0).args,
        ["123", "test-access-token"],
      );
      assert.equal(responseStub.setHeader.callCount, 2);
      assert.deepStrictEqual(responseStub.setHeader.getCall(0).args, [
        "Content-Type",
        "image/jpeg",
      ]);
      assert.deepStrictEqual(responseStub.setHeader.getCall(1).args, [
        "Content-Disposition",
        "inline",
      ]);
      assert.equal(responseStub.send.callCount, 1);
      assert.deepStrictEqual(responseStub.send.getCall(0).args, [mockBuffer]);
    });

    it("serveCoronersLetterDocument handles different content types", async () => {
      const mockBuffer = Buffer.from("fake pdf data");
      viewApplicationAdaptorStub.getCoronersLetterDocument.resolves({
        data: mockBuffer,
        contentType: "application/pdf",
      });

      await applicationAdaptor.serveCoronersLetterDocument(
        requestStub,
        responseStub,
        "456",
      );

      assert.deepStrictEqual(responseStub.setHeader.getCall(0).args, [
        "Content-Type",
        "application/pdf",
      ]);
    });

    it("serveCoronersLetterDocument renders error page when port call fails", async () => {
      viewApplicationAdaptorStub.getCoronersLetterDocument.rejects(
        new Error("API error"),
      );

      // Configure the stub to return itself for chaining
      responseStub.status.returns(responseStub);

      await applicationAdaptor.serveCoronersLetterDocument(
        requestStub,
        responseStub,
        "789",
      );

      assert.equal(
        viewApplicationAdaptorStub.getCoronersLetterDocument.callCount,
        1,
      );
      assert.equal(responseStub.status.callCount, 1);
      assert.deepStrictEqual(responseStub.status.getCall(0).args, [500]);
      assert.equal(responseStub.render.callCount, 1);
      assert.deepStrictEqual(responseStub.render.getCall(0).args, [
        "application/error",
        {
          status: "Unable to retrieve document",
          error: "Unable to retrieve document. Please try again later",
        },
      ]);
      assert.equal(responseStub.send.callCount, 0);
    });
  });

  describe("History tab", () => {
    it("renders empty history and no historyError when getApplicationHistory returns empty array", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        historyRows: [],
        historyError: false,
      });
    });

    it("renders Application received event with correct label", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-21T10:30:00.000Z",
          actor: "System",
          eventReference: "EVT-BUS-APP-001",
          eventData: null,
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(historyRows.length, 1);
      assert.equal(
        historyRows[0][2].html,
        "<strong>Application received</strong>",
      );
    });

    it("renders Certificate created event with correct label", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-23T09:00:00.000Z",
          actor: "System",
          eventReference: "EVT-BUS-APP-003",
          eventData: { laaReference: "1" },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        '<strong>Certificate created</strong><br /><a href="/applications/1/certificate">View certificate</a>',
      );
    });

    it("renders Interested parties updated event with correct label", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-24T16:45:00.000Z",
          actor: "John Doe",
          eventReference: "EVT-BUS-APP-004",
          eventData: {
            oldPublicBodies: ["Cabinet Office"],
            newPublicBodies: ["Cabinet Office", "Ministry of Justice"],
          },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>Interested parties updated from Cabinet Office to Cabinet Office, Ministry of Justice</strong>",
      );
    });

    it("renders unknown event reference with escaped fallback", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-25T11:00:00.000Z",
          actor: "Admin",
          eventReference: "UNKNOWN-EVENT-CODE",
          eventData: null,
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>UNKNOWN-EVENT-CODE</strong>",
      );
    });

    it("escapes HTML in actor field", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-26T12:00:00.000Z",
          actor: "<script>alert('xss')</script>",
          eventReference: "EVT-BUS-APP-001",
          eventData: null,
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(historyRows[0][1].text, "<script>alert('xss')</script>");
    });

    it("escapes HTML in unknown event reference fallback", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-27T13:30:00.000Z",
          actor: "System",
          eventReference: "<script>alert('xss')</script>",
          eventData: null,
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</strong>",
      );
    });

    it("formats event data with meritsDecision substitution", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-28T08:00:00.000Z",
          actor: "Jane Smith",
          eventReference: "EVT-BUS-APP-002",
          eventData: { meritsDecision: "granted" },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>Application granted</strong>",
      );
    });

    it("formats refused application with refusal reason and justification", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-28T08:00:00.000Z",
          actor: "Jane Smith",
          eventReference: "EVT-BUS-APP-002",
          eventData: {
            meritsDecision: "Refused",
            refusalReason: "NOT_IN_SCOPE",
            refusalJustification: "Test refusal justification",
          },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>Application refused</strong><br />Not in scope<br />Test refusal justification",
      );
    });

    it("cannot format refused application without refusal reason or justification", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-28T08:00:00.000Z",
          actor: "Jane Smith",
          eventReference: "EVT-BUS-APP-002",
          eventData: {
            meritsDecision: "Refused",
          },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("formats claim decision with claimDecision substitution", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-28T08:00:00.000Z",
          actor: "Jane Smith",
          eventReference: "EVT-BUS-CLM-002",
          eventData: {
            claimType: "FINAL_BILL",
            claimDecision: "REJECTED",
            decisionJustification: "Test justification",
          },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(
        historyRows[0][2].html,
        "<strong>Final bill claim rejected</strong>",
      );
    });

    it("formats multiple history events in correct order", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.resolves([
        {
          timestamp: "2026-05-21T10:00:00.000Z",
          actor: "System",
          eventReference: "EVT-BUS-APP-001",
          eventData: null,
        },
        {
          timestamp: "2026-05-22T11:00:00.000Z",
          actor: "Jane Smith",
          eventReference: "EVT-BUS-APP-002",
          eventData: { meritsDecision: "granted" },
        },
        {
          timestamp: "2026-05-23T12:00:00.000Z",
          actor: "System",
          eventReference: "EVT-BUS-APP-003",
          eventData: { laaReference: "1" },
        },
      ]);

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      const viewData = renderArgs[1] as unknown as Record<string, unknown>;
      const historyRows = viewData.historyRows as Array<
        Array<{ text?: string; html?: string }>
      >;
      assert.equal(historyRows.length, 3);
      assert.equal(
        historyRows[0][2].html,
        "<strong>Application received</strong>",
      );
      assert.equal(
        historyRows[1][2].html,
        "<strong>Application granted</strong>",
      );
      assert.equal(
        historyRows[2][2].html,
        '<strong>Certificate created</strong><br /><a href="/applications/1/certificate">View certificate</a>',
      );
    });

    it("sets historyError flag when getApplicationHistory fails", async () => {
      viewApplicationAdaptorStub.getApplication.resolves(application);
      viewApplicationAdaptorStub.getApplicationHistory.rejects(
        new Error("API connection failed"),
      );

      await applicationAdaptor.renderApplicationPage(
        requestStub,
        responseStub,
        "123",
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.partialDeepStrictEqual(renderArgs[1], {
        historyRows: [],
        historyError: true,
      });
    });

    describe("submitHistoryNote", () => {
      let addHistoryNoteUseCaseStub: StubbedInstance<AddHistoryNoteUseCase>;

      beforeEach(() => {
        addHistoryNoteUseCaseStub = stubInterface<AddHistoryNoteUseCase>();
        sessionHelperStub = stubInterface<SessionHelper>();
        viewApplicationAdaptorStub.getApplication.resolves(application);
        viewApplicationAdaptorStub.getApplicationHistory.resolves([]);
        applicationAdaptor = new ApplicationAdaptor(
          viewApplicationAdaptorStub,
          sessionHelperStub,
          undefined,
          claimsAdaptorStub,
          buildApplicationClaimsViewUseCaseStub,
          undefined,
          addHistoryNoteUseCaseStub,
          new AddHistoryNoteValidator(),
        );
      });

      it("re-renders with validation error when note is empty", async () => {
        requestStub.body = { "note-text": "" };

        await applicationAdaptor.submitHistoryNote(
          requestStub,
          responseStub,
          "123",
        );

        assert.equal(responseStub.render.callCount, 1);
        const renderArgs = responseStub.render.getCall(0).args;
        assert.equal(renderArgs[0], "application/application-overview");
        const viewData = renderArgs[1] as unknown as Record<string, unknown>;
        assert.deepEqual(viewData.errorSummaries, [
          {
            text: en.pages.applicationOverview.history.validationErrors.empty,
            href: "#note-text",
          },
        ]);
        assert.equal(viewData.noteText, "");
        assert.equal(addHistoryNoteUseCaseStub.execute.callCount, 0);
      });

      it("re-renders with validation error when note contains only whitespace", async () => {
        requestStub.body = { "note-text": "   " };

        await applicationAdaptor.submitHistoryNote(
          requestStub,
          responseStub,
          "123",
        );

        const renderArgs = responseStub.render.getCall(0).args;
        const viewData = renderArgs[1] as unknown as Record<string, unknown>;
        assert.deepEqual(viewData.errorSummaries, [
          {
            text: en.pages.applicationOverview.history.validationErrors.empty,
            href: "#note-text",
          },
        ]);
        assert.equal(viewData.noteText, "   ");
      });

      it("re-renders with validation error and excess count when note exceeds 10,000 characters", async () => {
        requestStub.body = { "note-text": "a".repeat(10005) };

        await applicationAdaptor.submitHistoryNote(
          requestStub,
          responseStub,
          "123",
        );

        const renderArgs = responseStub.render.getCall(0).args;
        const viewData = renderArgs[1] as unknown as Record<string, unknown>;
        assert.deepEqual(viewData.errorSummaries, [
          {
            text: en.pages.applicationOverview.history.validationErrors.tooLong,
            href: "#note-text",
          },
        ]);
        assert.equal(viewData.excessCount, 5);
        assert.equal(viewData.noteText, "a".repeat(10005));
      });

      it("redirects and sets session flash when use case succeeds", async () => {
        requestStub.body = { "note-text": "This is a valid note" };
        addHistoryNoteUseCaseStub.execute.resolves({
          status: "SUCCESS",
          data: undefined,
        });

        await applicationAdaptor.submitHistoryNote(
          requestStub,
          responseStub,
          "123",
        );

        assert.equal(responseStub.redirect.callCount, 1);
        assert.equal(
          responseStub.redirect.getCall(0).args[0],
          "/applications/123/overview",
        );
        assert.equal(sessionHelperStub.setFlash.callCount, 1);
        assert.deepEqual(sessionHelperStub.setFlash.getCall(0).args, [
          requestStub,
          "history",
          "note-added",
        ]);
        assert.equal(responseStub.render.callCount, 0);
      });

      it("re-renders with save error and retained text when use case fails", async () => {
        requestStub.body = { "note-text": "A valid note" };
        addHistoryNoteUseCaseStub.execute.resolves({
          status: "TECHNICAL_FAILURE",
          reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        });

        await applicationAdaptor.submitHistoryNote(
          requestStub,
          responseStub,
          "123",
        );

        const renderArgs = responseStub.render.getCall(0).args;
        const viewData = renderArgs[1] as unknown as Record<string, unknown>;
        assert.deepEqual(viewData.errorSummaries, [
          {
            text: en.pages.applicationOverview.history.validationErrors
              .saveFailed,
            href: "#note-text",
          },
        ]);
        assert.equal(viewData.noteText, "A valid note");
      });
    });
  });
});
