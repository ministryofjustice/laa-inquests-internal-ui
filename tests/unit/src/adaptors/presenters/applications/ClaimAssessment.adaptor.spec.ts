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

  it("re-renders with validation errors when assessClaim is missing", async () => {
    requestStub.body = {};
    const renderClaimAssessmentPageSpy = sinon.spy(
      adaptor,
      "renderClaimAssessmentPage",
    );

    await adaptor.processClaimAssessmentPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(renderClaimAssessmentPageSpy.callCount, 1);
    assert.deepStrictEqual(renderClaimAssessmentPageSpy.getCall(0).args[4], {
      assessClaim: {
        text: "Select the claim decision",
      },
    });
  });

  it("redirects to confirmation page when assessClaim is present", async () => {
    requestStub.body = {
      assessClaim: "pay in full",
    };

    await adaptor.processClaimAssessmentPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(responseStub.redirect.callCount, 1);
    assert.deepStrictEqual(responseStub.redirect.getCall(0).args, [
      "/applications/123/claims/10/confirmation",
    ]);
  });

  it("renders confirmation placeholder without calling source APIs", () => {
    adaptor.renderClaimAssessmentConfirmationPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(responseStub.render.callCount, 1);
    assert.deepStrictEqual(responseStub.render.getCall(0).args, [
      "application/claims/assess/confirmation/index",
      {
        backUrl: "/applications/123/claims/10",
        applicationId: "123",
        claimId: "10",
      },
    ]);
    assert.equal(applicationPortStub.getApplication.callCount, 0);
    assert.equal(claimsPortStub.getClaimById.callCount, 0);
  });
});
