import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import { BuildClaimRejectionViewUseCase } from "#src/use-cases/applications/claims/BuildClaimRejectionView.useCase.js";
import { ClaimAssessmentValidator } from "#src/adaptors/presenter/applications/ClaimAssessment.validator.js";
import { ProcessClaimAssessmentUseCase } from "#src/use-cases/applications/claims/ProcessClaimAssessment.useCase.js";
import { RejectClaimUseCase } from "#src/use-cases/applications/claims/RejectClaim.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { GetClaimEvidenceUseCase } from "#src/use-cases/applications/claims/GetClaimEvidence.useCase.js";

describe("ClaimAssessmentAdaptor", () => {
  let adaptor: ClaimAssessmentAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;
  let claimsPortStub: StubbedInstance<ClaimsPort>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let buildClaimAssessmentViewUseCaseStub: StubbedInstance<BuildClaimAssessmentViewUseCase>;
  let validatorStub: StubbedInstance<ClaimAssessmentValidator>;
  let processClaimAssessmentUseCaseStub: StubbedInstance<ProcessClaimAssessmentUseCase>;
  let rejectClaimUseCaseStub: StubbedInstance<RejectClaimUseCase>;
  let buildClaimRejectionViewUseCaseStub: StubbedInstance<BuildClaimRejectionViewUseCase>;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    applicationPortStub = stubInterface<ApplicationPort>();
    claimsPortStub = stubInterface<ClaimsPort>();
    sessionHelperStub = stubInterface<SessionHelper>();
    buildClaimAssessmentViewUseCaseStub =
      stubInterface<BuildClaimAssessmentViewUseCase>();
    validatorStub = stubInterface<ClaimAssessmentValidator>();
    processClaimAssessmentUseCaseStub =
      stubInterface<ProcessClaimAssessmentUseCase>();
    rejectClaimUseCaseStub = stubInterface<RejectClaimUseCase>();
    buildClaimRejectionViewUseCaseStub =
      stubInterface<BuildClaimRejectionViewUseCase>();

    buildClaimRejectionViewUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: { claimType: "Payment on account" },
    });

    buildClaimAssessmentViewUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: {
        laaReference: "123",
        claimId: "10",
        claimStatus: "Reject",
        overview: {
          paymentType: "Payment on account",
          paymentAmount: "£1,200",
          substantiveCertificate: "£10,000",
          totalRemaining: "£10,000",
        },
        details: {
          instructedCounsel: "-",
          lastWorkingDate: "-",
          outcomeOfInquest: "-",
          alternateFundingProgressed: "-",
        },
        claimCostBreakdown: {
          fileName: "final_bill_costs.xlsx",
          downloadHref: "#",
        },
        supportingEvidence: [
          {
            fileName: "claim-evidence-1.pdf",
            viewHref: "#",
            downloadHref: "#",
          },
        ],
      },
    });

    requestStub.session.user = {
      userId: "test-user-id",
      accessToken: "test-access-token",
    };

    adaptor = new ClaimAssessmentAdaptor(
      sessionHelperStub,
      buildClaimAssessmentViewUseCaseStub,
      rejectClaimUseCaseStub,
      buildClaimRejectionViewUseCaseStub,
      new GetClaimEvidenceUseCase(claimsPortStub),
      validatorStub,
      processClaimAssessmentUseCaseStub,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders claim assessment page with use case data", async () => {
    await adaptor.renderClaimAssessmentPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(buildClaimAssessmentViewUseCaseStub.execute.callCount, 1);
    assert.deepStrictEqual(
      buildClaimAssessmentViewUseCaseStub.execute.getCall(0).args[0],
      {
        laaReference: "123",
        claimId: "10",
        accessToken: "test-access-token",
      },
    );

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/assess/index",
    );
    assert.partialDeepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/overview",
      laaReference: "123",
      claimId: "10",
      claimStatus: "Reject",
      claimCostBreakdown: {
        fileName: "final_bill_costs.xlsx",
        downloadHref: "#",
      },
    });
  });

  it("clears stale claim approval session data on a fresh GET", async () => {
    requestStub.method = "GET";
    requestStub.query = {};

    await adaptor.renderClaimAssessmentPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
    assert.deepStrictEqual(sessionHelperStub.clearSessionData.getCall(0).args, [
      requestStub,
      "claimApproval",
    ]);
  });

  it("does not clear claim approval session data when arriving from check your answers", async () => {
    requestStub.method = "GET";
    requestStub.query = { from: "check-your-answers" };

    await adaptor.renderClaimAssessmentPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
  });

  describe("processClaimAssessmentForm", () => {
    function buildPostRequest(
      assessClaim: string,
      rejectionReason: string,
    ): TypedRequest<AssessClaimForm, ClaimIdParams> {
      return {
        ...requestStub,
        body: {
          assessClaim,
          "rejection-reason": rejectionReason,
        },
        params: {
          laaReference: "123",
          claimId: "10",
        },
      } as unknown as TypedRequest<AssessClaimForm, ClaimIdParams>;
    }

    it("redirects to the confirm profit costs page when validation passes", async () => {
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "SUCCESS",
        data: { assessClaim: "Pay in full", rejectionReason: "" },
      });

      await adaptor.processClaimAssessmentForm(
        buildPostRequest("Pay in full", ""),
        responseStub,
      );

      assert.deepStrictEqual(responseStub.redirect.getCall(0).args, [
        "/applications/123/claims/10/confirm-profit-costs",
      ]);
      assert.equal(responseStub.render.callCount, 0);
      assert.equal(rejectClaimUseCaseStub.execute.callCount, 0);
    });

    it("rejects the claim then redirects to the rejection success page when Reject is selected with a valid reason", async () => {
      const logInfoStub = sinon.stub(logger, "logInfo");
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "SUCCESS",
        data: {
          assessClaim: "Reject",
          rejectionReason: "Not enough supporting evidence provided",
        },
      });
      rejectClaimUseCaseStub.execute.resolves({
        status: "SUCCESS",
      });

      await adaptor.processClaimAssessmentForm(
        buildPostRequest("Reject", "Not enough supporting evidence provided"),
        responseStub,
      );

      assert.equal(rejectClaimUseCaseStub.execute.callCount, 1);
      assert.deepStrictEqual(
        rejectClaimUseCaseStub.execute.getCall(0).args[0],
        {
          laaReference: "123",
          claimId: "10",
          justification: "Not enough supporting evidence provided",
          accessToken: "test-access-token",
        },
      );
      assert.equal(
        logInfoStub
          .getCalls()
          .filter(
            (call) => call.args[0].extraContext?.event === "claim_rejected",
          ).length,
        1,
      );
      assert.deepStrictEqual(responseStub.redirect.getCall(0).args, [
        "/applications/123/claims/10/rejected",
      ]);
    });

    it("throws when rejecting the claim fails upstream", async () => {
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "SUCCESS",
        data: {
          assessClaim: "Reject",
          rejectionReason: "Not enough supporting evidence provided",
        },
      });
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        "reject_claim",
        true,
      );
      rejectClaimUseCaseStub.execute.rejects(error);

      await assert.rejects(
        adaptor.processClaimAssessmentForm(
          buildPostRequest("Reject", "Not enough supporting evidence provided"),
          responseStub,
        ),
        (thrown: unknown) => thrown === error,
      );

      assert.equal(responseStub.redirect.callCount, 0);
    });

    it("re-renders the claim assessment page with errors when validation fails", async () => {
      const validationErrors = {
        rejectionReason: { text: "Enter a reason for rejecting the claim" },
      };
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "VALIDATION_FAILED",
        validationErrors,
        data: { assessClaim: "Reject", rejectionReason: "" },
      });

      await adaptor.processClaimAssessmentForm(
        buildPostRequest("Reject", ""),
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 0);
      assert.equal(rejectClaimUseCaseStub.execute.callCount, 0);
      assert.equal(buildClaimAssessmentViewUseCaseStub.execute.callCount, 1);
      assert.partialDeepStrictEqual(responseStub.render.getCall(0).args[1], {
        assessClaim: "Reject",
        rejectionReason: "",
        errorSummaries: validationErrors,
      });
    });
  });

  describe("renderClaimRejectionSuccessPage", () => {
    it("renders the rejection success view with the application id and claim type", async () => {
      await adaptor.renderClaimRejectionSuccessPage(
        requestStub,
        responseStub,
        "123",
        "10",
      );

      assert.equal(buildClaimRejectionViewUseCaseStub.execute.callCount, 1);
      assert.deepStrictEqual(
        buildClaimRejectionViewUseCaseStub.execute.getCall(0).args[0],
        {
          laaReference: "123",
          claimId: "10",
          accessToken: "test-access-token",
        },
      );

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/claims/rejected/index",
      );
      assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
        laaReference: "123",
        claimType: "Payment on account",
      });
    });

    it("propagates errors when the claim rejection view cannot be built", async () => {
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        "get_claim",
        true,
      );
      buildClaimRejectionViewUseCaseStub.execute.rejects(error);

      await assert.rejects(
        adaptor.renderClaimRejectionSuccessPage(
          requestStub,
          responseStub,
          "123",
          "10",
        ),
        (thrown: unknown) => thrown === error,
      );

      assert.equal(responseStub.render.callCount, 0);
    });
  });

  describe("serveClaimEvidence", () => {
    it("fetches inline evidence and sends the buffer with forwarded headers", async () => {
      const mockBuffer = Buffer.from("fake evidence data");
      claimsPortStub.getClaimEvidence.resolves({
        data: mockBuffer,
        contentType: "application/pdf",
        contentDisposition: 'inline; filename="claim-evidence-1.pdf"',
      });

      await adaptor.serveClaimEvidence(
        requestStub,
        responseStub,
        "1",
        "inline",
      );

      assert.equal(claimsPortStub.getClaimEvidence.callCount, 1);
      assert.deepStrictEqual(claimsPortStub.getClaimEvidence.getCall(0).args, [
        "1",
        "inline",
        "test-access-token",
      ]);
      assert.equal(responseStub.setHeader.callCount, 2);
      assert.deepStrictEqual(responseStub.setHeader.getCall(0).args, [
        "Content-Type",
        "application/pdf",
      ]);
      assert.deepStrictEqual(responseStub.setHeader.getCall(1).args, [
        "Content-Disposition",
        'inline; filename="claim-evidence-1.pdf"',
      ]);
      assert.equal(responseStub.send.callCount, 1);
      assert.deepStrictEqual(responseStub.send.getCall(0).args, [mockBuffer]);
    });

    it("passes the attachment disposition through to the port", async () => {
      claimsPortStub.getClaimEvidence.resolves({
        data: Buffer.from("data"),
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="claim-evidence-1.pdf"',
      });

      await adaptor.serveClaimEvidence(
        requestStub,
        responseStub,
        "1",
        "attachment",
      );

      assert.deepStrictEqual(claimsPortStub.getClaimEvidence.getCall(0).args, [
        "1",
        "attachment",
        "test-access-token",
      ]);
    });

    it("renders a 400 error page for an invalid disposition", async () => {
      responseStub.status.returns(responseStub);

      await adaptor.serveClaimEvidence(requestStub, responseStub, "1", "bogus");

      assert.equal(claimsPortStub.getClaimEvidence.callCount, 0);
      assert.deepStrictEqual(responseStub.status.getCall(0).args, [400]);
      assert.deepStrictEqual(responseStub.render.getCall(0).args, [
        "application/error",
        {
          status: 400,
          error: "Invalid claim evidence request.",
        },
      ]);
      assert.equal(responseStub.send.callCount, 0);
    });

    it("propagates evidence errors without rendering or duplicate logging", async () => {
      const logErrorStub = sinon.stub(logger, "logError");
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        "get_claim_evidence",
        true,
      );
      claimsPortStub.getClaimEvidence.rejects(error);

      await assert.rejects(
        adaptor.serveClaimEvidence(requestStub, responseStub, "1", "inline"),
        (thrown: unknown) => thrown === error,
      );

      assert.equal(claimsPortStub.getClaimEvidence.callCount, 1);
      assert.equal(responseStub.status.callCount, 0);
      assert.equal(responseStub.render.callCount, 0);
      assert.equal(responseStub.send.callCount, 0);
      assert.equal(logErrorStub.callCount, 0);
    });
  });
});
