import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { CertificateAdaptor } from "#src/adaptors/presenter/applications/Certificate.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationAdaptor,
  claimAssessmentAdaptor: ClaimAssessmentAdaptor,
  certificateDisplayAdaptor: CertificateAdaptor,
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
        await certificateDisplayAdaptor.renderCertificatePage(
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
      try {
        logger.logInfo({
          functionName: "application_route",
          message: "Claim assessment submitted",
          request: req,
          extraContext: {
            event: "claim_assessment_submitted",
            laa_reference: req.params.applicationId,
            claim_reference: req.params.claimId,
          },
        });
        await claimAssessmentAdaptor.processClaimAssessmentForm(
          req as unknown as TypedRequest<AssessClaimForm, ClaimIdParams>,
          res,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:applicationId/claims/:claimId/rejected",
    (req: Request, res: Response, next: NextFunction): void => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam = applicationId as string;

      try {
        claimAssessmentAdaptor.renderClaimRejectionSuccessPage(
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
    "/:applicationId/claims/:claimId/evidence/:claimEvidenceId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { claimEvidenceId },
        query: { disposition },
      } = req;
      const claimEvidenceIdParam = claimEvidenceId as string;
      const dispositionParam = disposition as string;

      try {
        await claimAssessmentAdaptor.serveClaimEvidence(
          req,
          res,
          claimEvidenceIdParam,
          dispositionParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return applicationRouter;
}

export default createApplicationRouter;
