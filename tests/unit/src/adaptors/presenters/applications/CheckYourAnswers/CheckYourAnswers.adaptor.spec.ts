import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { CheckYourAnswersAdaptor } from "#src/adaptors/presenter/applications/CheckYourAnswers/CheckYourAnswers.adaptor.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("CheckYourAnswersAdaptor", () => {
  let request: StubbedInstance<Request>;
  let response: StubbedInstance<Response>;
  let sessionHelper: StubbedInstance<SessionHelper>;
  let useCase: StubbedInstance<BuildCheckYourAnswersViewUseCase>;
  let adaptor: CheckYourAnswersAdaptor;

  beforeEach(() => {
    request = stubInterface<Request>();
    response = stubInterface<Response>();
    sessionHelper = stubInterface<SessionHelper>();
    useCase = stubInterface<BuildCheckYourAnswersViewUseCase>();
    request.session.user = { userId: "user", accessToken: "token" };
    sessionHelper.getSessionData.returns({});
    response.status.returns(response);
    adaptor = new CheckYourAnswersAdaptor(sessionHelper, useCase);
  });

  it("renders 404 for a missing claim", async () => {
    useCase.execute.resolves({ status: "NOT_FOUND" });

    await adaptor.renderCheckYourAnswersPage(request, response, "123", "10");

    assert.deepEqual(response.status.firstCall.args, [404]);
    assert.equal(response.render.firstCall.args[0], "application/error");
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
});
