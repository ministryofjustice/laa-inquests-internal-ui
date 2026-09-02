import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { CertificateAdaptor } from "#src/adaptors/presenter/applications/Certificate.adaptor.js";
import { APPLICATION_STATUSES } from "#src/infrastructure/locales/constants.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";

describe("CertificateAdaptor", () => {
  let buildCertificateViewUseCaseStub: StubbedInstance<BuildCertificateViewUseCase>;
  let certificateAdaptor: CertificateAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let logInfoStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;

  const application = {
    laaReference: "123",
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
    buildCertificateViewUseCaseStub =
      stubInterface<BuildCertificateViewUseCase>();
    logInfoStub = sinon.stub(logger, "logInfo");
    logErrorStub = sinon.stub(logger, "logError");
    buildCertificateViewUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: certificateDetails,
    });
    certificateAdaptor = new CertificateAdaptor(
      buildCertificateViewUseCaseStub,
    );
    requestStub.session.user = {
      userId: "test-user-id",
      accessToken: "test-access-token",
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("renderCertificatePage", () => {
    it("calls certificate view use case once with application id and access token", async () => {
      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(buildCertificateViewUseCaseStub.execute.callCount, 1);
      assert.deepStrictEqual(
        buildCertificateViewUseCaseStub.execute.getCall(0).args,
        [
          {
            applicationId: application.laaReference.toString(),
            accessToken: "test-access-token",
          },
        ],
      );
    });

    it("logs info when certificate page is requested", async () => {
      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(logInfoStub.callCount, 1);
      assert.deepStrictEqual(logInfoStub.getCall(0).args, [
        {
          functionName: "render_certificate_page",
          message: "Certificate details requested",
          request: requestStub,
          extraContext: {
            event: "certificate_page_requested",
            laa_reference: application.laaReference.toString(),
          },
        },
      ]);
    });

    it("renders certificate page", async () => {
      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/certificate");
      assert.deepStrictEqual(renderArgs[1], {
        backUrl: `/applications/${application.laaReference}/overview`,
        certificateDetails: {
          ...certificateDetails,
          clientAddress: "1 Test Road<br>London<br>SW1A 1AA",
          officeAddress: "Test Office Address<br>London<br>SW1A 1AA",
          opponentDetails: "Cabinet Office",
          dateCreated: "19 May 2026",
          effectiveDate: "05 September 2025",
          dateWorkCanCommence: "05 September 2025",
          dateCurrentLevelOfServiceEffective: "05 September 2025",
          costLimitation: "£10,000",
          certificateType: "Substantive",
          categoryOfLaw: "Inquests",
          levelOfService: "Full representation",
          scopeLimitationHeading: "Final hearing",
        },
      });
    });

    it("renders an error page when certificate view returns with TECHNICAL_FAILURE", async () => {
      responseStub.status.returns(responseStub);
      buildCertificateViewUseCaseStub.execute.resolves({
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        message: "Unable to build certificate view",
      });

      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(responseStub.status.callCount, 1);
      assert.deepStrictEqual(responseStub.status.getCall(0).args, [500]);
      assert.equal(responseStub.render.callCount, 1);
      assert.deepStrictEqual(responseStub.render.getCall(0).args, [
        "application/error",
        {
          status: "Unable to retrieve certificate",
          error: "Unable to retrieve certificate. Please try again later",
        },
      ]);
    });

    it("renders a 404 not found page when certificate view returns RESOURCE_NOT_FOUND", async () => {
      responseStub.status.returns(responseStub);
      buildCertificateViewUseCaseStub.execute.resolves({
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.RESOURCE_NOT_FOUND,
        message: "Certificate not found for application 123",
      });

      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(responseStub.status.callCount, 1);
      assert.deepStrictEqual(responseStub.status.getCall(0).args, [404]);
      assert.equal(responseStub.render.callCount, 1);
      assert.deepStrictEqual(responseStub.render.getCall(0).args, [
        "application/error",
        {
          status: 404,
          error: "The certificate for this application could not be found.",
        },
      ]);
    });

    it("logs error when certificate returns with TECHNICAL_FAILURE", async () => {
      buildCertificateViewUseCaseStub.execute.resolves({
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        message: "Unable to build certificate view",
      });

      responseStub.status.returns(responseStub);
      await certificateAdaptor.renderCertificatePage(
        requestStub,
        responseStub,
        application.laaReference.toString(),
      );

      assert.equal(logErrorStub.callCount, 1);
      assert.deepStrictEqual(logErrorStub.getCall(0).args, [
        {
          functionName: "render_certificate_page",
          message: "Failed to build certificate view",
          err: "Unable to build certificate view",
          request: requestStub,
          extraContext: {
            event: "certificate_page_failed",
            laa_reference: application.laaReference.toString(),
            result_status: "TECHNICAL_FAILURE",
          },
        },
      ]);
    });
  });
});
