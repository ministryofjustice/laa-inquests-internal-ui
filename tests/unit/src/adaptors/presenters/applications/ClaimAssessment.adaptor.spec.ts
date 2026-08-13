import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";

describe("ClaimAssessmentAdaptor", () => {
  let adaptor: ClaimAssessmentAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;
  let claimsPortStub: StubbedInstance<ClaimsPort>;
  let buildClaimAssessmentViewUseCaseStub: StubbedInstance<BuildClaimAssessmentViewUseCase>;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    applicationPortStub = stubInterface<ApplicationPort>();
    claimsPortStub = stubInterface<ClaimsPort>();
    buildClaimAssessmentViewUseCaseStub =
      stubInterface<BuildClaimAssessmentViewUseCase>();

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
