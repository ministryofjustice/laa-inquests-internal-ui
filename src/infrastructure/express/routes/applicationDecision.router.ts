import type { Request, Response, Router } from "express";
import type { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { IdParams, TypedRequest } from "../api.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type {
  ApplicationDecisionForm,
  JustificationForm,
  CertificateStartDateForm,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";

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
    async (req: Request, res: Response): Promise<void> => {
      await applicationDecisionAdaptor.processApplicationDecisionForm(
        req as unknown as TypedRequest<ApplicationDecisionForm, IdParams>,
        res,
      );
    },
  );

  applicationDecisionRouter.get(
    "/:applicationId/decision/justification",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.renderJustificationForm(req, res);
    },
  );

  applicationDecisionRouter.post(
    "/:applicationId/decision/justification",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.processJustificationForm(
        req as unknown as TypedRequest<JustificationForm, IdParams>,
        res,
      );
    },
  );

  applicationDecisionRouter.get(
    "/:applicationId/decision/certificate-start-date",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.renderCertificateStartDateForm(req, res);
    },
  );

  applicationDecisionRouter.post(
    "/:applicationId/decision/certificate-start-date",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.processCertificateStartDateForm(
        req as unknown as TypedRequest<CertificateStartDateForm, IdParams>,
        res,
      );
    },
  );

  applicationDecisionRouter.get(
    "/:applicationId/decision/confirmation",
    (req: Request, res: Response): void => {
      applicationDecisionAdaptor.renderConfirmationPage(req, res);
    },
  );

  applicationDecisionRouter.post(
    "/:applicationId/decision/confirmation",
    async (req: Request, res: Response): Promise<void> => {
      logger.logInfo({
        functionName: "application_decision_route",
        message: "Decision confirmation submitted",
        request: req,
        extraContext: {
          event: "decision_confirmation_submitted",
          laa_reference: req.params.applicationId,
        },
      });
      await applicationDecisionAdaptor.processConfirmationForm(req, res);
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
