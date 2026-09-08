import type { NextFunction, Request, Response, Router } from "express";
import type { CheckYourAnswersAdaptor } from "#src/adaptors/presenter/applications/CheckYourAnswers/CheckYourAnswers.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

export function createCheckYourAnswersRouter(
  checkYourAnswersRouter: Router,
  checkYourAnswersAdaptor: CheckYourAnswersAdaptor,
): Router {
  checkYourAnswersRouter.get(
    "/:laaReference/claims/:claimId/check-your-answers",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimId },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimIdParam = claimId as string;

      try {
        await checkYourAnswersAdaptor.renderCheckYourAnswersPage(
          req,
          res,
          laaReferenceParam,
          claimIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  checkYourAnswersRouter.post(
    "/:laaReference/claims/:claimId/check-your-answers",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await checkYourAnswersAdaptor.processFinishAssessingClaim(
          req as unknown as TypedRequest<Record<string, never>, ClaimIdParams>,
          res,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return checkYourAnswersRouter;
}
