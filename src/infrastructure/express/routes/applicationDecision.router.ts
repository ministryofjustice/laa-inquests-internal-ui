import type { Request, Response, Router } from "express";
import type { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { IdParams, TypedRequest } from "../api.types.js";
import type { ApplicationDecisionForm } from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";

export function createApplicationDecisionRouter(
  applicationDecisionRouter: Router,
  applicationDecisionAdaptor: ApplicationDecisionAdaptor,
): Router {
  applicationDecisionRouter.get(
    "/:applicationId/decision",
    async (req: Request, res: Response): Promise<void> => {
      await applicationDecisionAdaptor.renderApplicationDecisionForm(req, res);
    },
  );

  applicationDecisionRouter.post(
    "/:applicationId/decision",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.processApplicationDecisionForm(
        req as unknown as TypedRequest<ApplicationDecisionForm, IdParams>,
        res,
      );
    },
  );

  applicationDecisionRouter.get(
    "/:applicationId/decision/success",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.renderDecisionSuccessPage(req, res);
    },
  );

  return applicationDecisionRouter;
}
