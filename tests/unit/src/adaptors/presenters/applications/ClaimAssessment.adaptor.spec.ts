import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import { ClaimAssessmentValidator } from "#src/adaptors/presenter/applications/ClaimAssessment.validator.js";
import { ProcessClaimAssessmentUseCase } from "#src/use-cases/applications/claims/ProcessClaimAssessment.useCase.js";
import { RejectClaimUseCase } from "#src/use-cases/applications/claims/RejectClaim.useCase.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

describe("ClaimAssessmentAdaptor", () => {
  let adaptor: ClaimAssessmentAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;
  let claimsPortStub: StubbedInstance<ClaimsPort>;
  let buildClaimAssessmentViewUseCaseStub: StubbedInstance<BuildClaimAssessmentViewUseCase>;
  let validatorStub: StubbedInstance<ClaimAssessmentValidator>;
  let processClaimAssessmentUseCaseStub: StubbedInstance<ProcessClaimAssessmentUseCase>;
  let rejectClaimUseCaseStub: StubbedInstance<RejectClaimUseCase>;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    applicationPortStub = stubInterface<ApplicationPort>();
    claimsPortStub = stubInterface<ClaimsPort>();
    buildClaimAssessmentViewUseCaseStub =
      stubInterface<BuildClaimAssessmentViewUseCase>();
    validatorStub = stubInterface<ClaimAssessmentValidator>();
    processClaimAssessmentUseCaseStub =
      stubInterface<ProcessClaimAssessmentUseCase>();
    rejectClaimUseCaseStub = stubInterface<RejectClaimUseCase>();

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
      applicationPortStub,
      claimsPortStub,
      buildClaimAssessmentViewUseCaseStub,
      validatorStub,
      processClaimAssessmentUseCaseStub,
      rejectClaimUseCaseStub,
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
        applicationId: "123",
        claimId: "10",
        applicationPort: applicationPortStub,
        claimsPort: claimsPortStub,
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
      applicationId: "123",
      claimId: "10",
      claimStatus: "Reject",
    });
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
          applicationId: "123",
          claimId: "10",
        },
      } as unknown as TypedRequest<AssessClaimForm, ClaimIdParams>;
    }

    it("redirects to the application overview when validation passes", async () => {
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "SUCCESS",
        data: { assessClaim: "Pay in full", rejectionReason: "" },
      });

      await adaptor.processClaimAssessmentForm(
        buildPostRequest("Pay in full", ""),
        responseStub,
      );

      assert.deepStrictEqual(responseStub.redirect.getCall(0).args, [
        "/applications/123/overview",
      ]);
      assert.equal(responseStub.render.callCount, 0);
      assert.equal(rejectClaimUseCaseStub.execute.callCount, 0);
    });

    it("rejects the claim then redirects when Reject is selected with a valid reason", async () => {
      processClaimAssessmentUseCaseStub.execute.returns({
        status: "SUCCESS",
        data: {
          assessClaim: "Reject",
          rejectionReason: "Not enough supporting evidence provided",
        },
      });
      rejectClaimUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: undefined,
      });

      await adaptor.processClaimAssessmentForm(
        buildPostRequest("Reject", "Not enough supporting evidence provided"),
        responseStub,
      );

      assert.equal(rejectClaimUseCaseStub.execute.callCount, 1);
      assert.deepStrictEqual(
        rejectClaimUseCaseStub.execute.getCall(0).args[0],
        {
          applicationId: "123",
          claimId: "10",
          justification: "Not enough supporting evidence provided",
          claimsPort: claimsPortStub,
          accessToken: "test-access-token",
        },
      );
      assert.deepStrictEqual(responseStub.redirect.getCall(0).args, [
        "/applications/123/overview",
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
      rejectClaimUseCaseStub.execute.resolves({
        status: "TECHNICAL_FAILURE",
        reason: "UPSTREAM_REJECTED",
      });

      await assert.rejects(
        adaptor.processClaimAssessmentForm(
          buildPostRequest("Reject", "Not enough supporting evidence provided"),
          responseStub,
        ),
        /Unable to reject claim/,
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
          status: "Invalid request",
          error: "Unable to retrieve evidence. Please try again later",
        },
      ]);
      assert.equal(responseStub.send.callCount, 0);
    });

    it("renders a 500 error page when the port call fails", async () => {
      responseStub.status.returns(responseStub);
      claimsPortStub.getClaimEvidence.rejects(new Error("API error"));

      await adaptor.serveClaimEvidence(
        requestStub,
        responseStub,
        "1",
        "inline",
      );

      assert.equal(claimsPortStub.getClaimEvidence.callCount, 1);
      assert.deepStrictEqual(responseStub.status.getCall(0).args, [500]);
      assert.deepStrictEqual(responseStub.render.getCall(0).args, [
        "application/error",
        {
          status: "Unable to retrieve evidence",
          error: "Unable to retrieve evidence. Please try again later",
        },
      ]);
      assert.equal(responseStub.send.callCount, 0);
    });
  });
});
