import { strict as assert } from "assert";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import { createCheckYourAnswersRouter } from "#src/infrastructure/express/routes/checkYourAnswers.router.js";
import type { CheckYourAnswersAdaptor } from "#src/adaptors/presenter/applications/CheckYourAnswers/CheckYourAnswers.adaptor.js";

describe("createCheckYourAnswersRouter", () => {
  it("passes rejected presenter calls to next unchanged", async () => {
    const router = express.Router();
    const adaptor = stubInterface<CheckYourAnswersAdaptor>();
    const error = new Error("failed");
    adaptor.renderCheckYourAnswersPage.rejects(error);
    createCheckYourAnswersRouter(router, adaptor);
    const route = router.stack.find(
      (layer) =>
        layer.route?.path ===
        "/:laaReference/claims/:claimId/check-your-answers",
    );
    const handler = route?.route?.stack[0].handle as (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => Promise<void>;
    const request = stubInterface<Request>();
    const response = stubInterface<Response>();
    const next = sinon.stub();
    request.params = { laaReference: "123", claimId: "10" };

    await handler(request, response, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });
});
