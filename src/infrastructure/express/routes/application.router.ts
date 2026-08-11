import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationAdaptor,
  claimAssessmentAdaptor: ClaimAssessmentAdaptor,
): Router {
  applicationRouter.get(
    "/:applicationId/overview",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId as string;
      try {
        await applicationDisplayAdaptor.renderApplicationPage(
          req,
          res,
          applicationIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:applicationId/coroners-letter",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId as string;
      try {
        await applicationDisplayAdaptor.serveCoronersLetterDocument(
          req,
          res,
          applicationIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:applicationId/certificate",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId as string;
      try {
        await applicationDisplayAdaptor.renderCertificatePage(
          req,
          res,
          applicationIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:applicationId/claims/:claimId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId, claimId },
      } = req;
      const applicationIdParam = applicationId as string;
      const claimIdParam = claimId as string;

      try {
        await claimAssessmentAdaptor.renderClaimAssessmentPage(
          req,
          res,
          applicationIdParam,
          claimIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.post(
    "/:applicationId/claims/:claimId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId, claimId },
      } = req;
      const applicationIdParam = applicationId as string;
      const claimIdParam = claimId as string;

      try {
        await claimAssessmentAdaptor.processClaimAssessmentPage(
          req,
          res,
          applicationIdParam,
          claimIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:applicationId/claims/:claimId/confirmation",
    (req: Request, res: Response): void => {
      const {
        params: { applicationId, claimId },
      } = req;
      const applicationIdParam = applicationId as string;
      const claimIdParam = claimId as string;

      claimAssessmentAdaptor.renderClaimAssessmentConfirmationPage(
        req,
        res,
        applicationIdParam,
        claimIdParam,
      );
    },
  );

  return applicationRouter;
}

export default createApplicationRouter;
