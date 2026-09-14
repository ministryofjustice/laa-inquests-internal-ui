import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { CheckYourAnswersAdaptor } from "#src/adaptors/presenter/applications/CheckYourAnswers/CheckYourAnswers.adaptor.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";
import { PayInFullClaimUseCase } from "#src/use-cases/applications/claims/PayInFullClaim.useCase.js";
import { BuildClaimPaidInFullViewUseCase } from "#src/use-cases/applications/claims/BuildClaimPaidInFullView.useCase.js";
import type { ClaimIdParams } from "#src/infrastructure/express/api.types.js";
import type { TypedRequest } from "#src/infrastructure/express/api.types.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("CheckYourAnswersAdaptor", () => {
  let request: StubbedInstance<Request>;
  let response: StubbedInstance<Response>;
  let sessionHelper: StubbedInstance<SessionHelper>;
  let useCase: StubbedInstance<BuildCheckYourAnswersViewUseCase>;
  let payInFullClaimUseCase: StubbedInstance<PayInFullClaimUseCase>;
  let buildClaimPaidInFullViewUseCase: StubbedInstance<BuildClaimPaidInFullViewUseCase>;
  let adaptor: CheckYourAnswersAdaptor;

  beforeEach(() => {
    request = stubInterface<Request>();
    response = stubInterface<Response>();
    sessionHelper = stubInterface<SessionHelper>();
    useCase = stubInterface<BuildCheckYourAnswersViewUseCase>();
    payInFullClaimUseCase = stubInterface<PayInFullClaimUseCase>();
    buildClaimPaidInFullViewUseCase =
      stubInterface<BuildClaimPaidInFullViewUseCase>();
    request.session.user = { userId: "user", accessToken: "token" };
    sessionHelper.getSessionData.returns({});
    response.status.returns(response);
    adaptor = new CheckYourAnswersAdaptor(
      sessionHelper,
      useCase,
      payInFullClaimUseCase,
      buildClaimPaidInFullViewUseCase,
    );
  });

  const buildProcessRequest = (): TypedRequest<
    Record<string, never>,
    ClaimIdParams
  > => {
    const processRequest = stubInterface<Request>();
    processRequest.session.user = { userId: "user", accessToken: "token" };
    (processRequest as unknown as { params: ClaimIdParams }).params = {
      laaReference: "123",
      claimId: "10",
    };
    return processRequest as unknown as TypedRequest<
      Record<string, never>,
      ClaimIdParams
    >;
  };

  it("renders 404 for a missing claim", async () => {
    useCase.execute.resolves({ status: "NOT_FOUND" });

    await adaptor.renderCheckYourAnswersPage(request, response, "123", "10");

    assert.deepEqual(response.status.firstCall.args, [404]);
    assert.equal(response.render.firstCall.args[0], "application/error");
  });

  it("renders the check your answers page with the disbursements back url", async () => {
    useCase.execute.resolves({
      status: "SUCCESS",
      data: {} as never,
    });

    await adaptor.renderCheckYourAnswersPage(request, response, "123", "10");

    const [view, locals] = response.render.firstCall.args as unknown as [
      string,
      { backUrl: string },
    ];
    assert.equal(view, "application/claims/check-your-answers/index");
    assert.equal(
      locals.backUrl,
      "/applications/123/claims/10/confirm-disbursement-costs",
    );
  });

  it("propagates application errors without rendering", async () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_claim",
      true,
    );
    useCase.execute.rejects(error);

    await assert.rejects(
      adaptor.renderCheckYourAnswersPage(request, response, "123", "10"),
      (thrown: unknown) => thrown === error,
    );
    assert.equal(response.render.callCount, 0);
  });

  it("pays the claim in full and redirects to the success page on submit", async () => {
    const processRequest = buildProcessRequest();
    sessionHelper.getSessionData.returns({
      netTotal: "1000",
      grossTotal: "1200",
      zeroVatTotal: "",
      disbursementNetTotal: "100",
      disbursementGrossTotal: "120",
      disbursementZeroVatTotal: "",
    });
    payInFullClaimUseCase.execute.resolves({ status: "SUCCESS" });

    await adaptor.processFinishAssessingClaim(processRequest, response);

    assert.equal(payInFullClaimUseCase.execute.callCount, 1);
    assert.deepEqual(payInFullClaimUseCase.execute.firstCall.args[0], {
      laaReference: "123",
      claimId: "10",
      data: {
        profitCostNet: 1000,
        profitCostGross: 1200,
        disbursementNet: 100,
        disbursementGross: 120,
      },
      accessToken: "token",
    });
    assert.deepEqual(response.redirect.firstCall.args, [
      "/applications/123/claims/10/paid-in-full",
    ]);
  });

  it("renders a 400 when the pay in full submission is invalid", async () => {
    const processRequest = buildProcessRequest();
    payInFullClaimUseCase.execute.resolves({ status: "INVALID_INPUT" });

    await adaptor.processFinishAssessingClaim(processRequest, response);

    assert.deepEqual(response.status.firstCall.args, [400]);
    assert.equal(response.render.firstCall.args[0], "application/error");
    assert.equal(response.redirect.callCount, 0);
  });

  it("propagates application errors from the pay in full submission", async () => {
    const processRequest = buildProcessRequest();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "pay_in_full_claim",
      true,
    );
    payInFullClaimUseCase.execute.rejects(error);

    await assert.rejects(
      adaptor.processFinishAssessingClaim(processRequest, response),
      (thrown: unknown) => thrown === error,
    );
    assert.equal(response.redirect.callCount, 0);
  });

  it("renders the paid in full success page", async () => {
    buildClaimPaidInFullViewUseCase.execute.resolves({
      status: "SUCCESS",
      data: { claimType: "Payment on account" },
    });

    await adaptor.renderClaimPaidInFullSuccessPage(
      request,
      response,
      "123",
      "10",
    );

    const [view, locals] = response.render.firstCall.args as unknown as [
      string,
      { laaReference: string; claimType: string },
    ];
    assert.equal(view, "application/claims/paid-in-full/index");
    assert.deepEqual(locals, {
      laaReference: "123",
      claimType: "Payment on account",
    });
  });

  it("renders 404 for a missing claim on the success page", async () => {
    buildClaimPaidInFullViewUseCase.execute.resolves({ status: "NOT_FOUND" });

    await adaptor.renderClaimPaidInFullSuccessPage(
      request,
      response,
      "123",
      "10",
    );

    assert.deepEqual(response.status.firstCall.args, [404]);
    assert.equal(response.render.firstCall.args[0], "application/error");
  });
});
