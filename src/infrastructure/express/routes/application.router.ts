import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { CertificateAdaptor } from "#src/adaptors/presenter/applications/Certificate.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationAdaptor,
  claimAssessmentAdaptor: ClaimAssessmentAdaptor,
  certificateDisplayAdaptor: CertificateAdaptor,
): Router {
  applicationRouter.get(
    "/:laaReference/overview",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.renderApplicationPage(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/coroners-letter",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.serveCoronersLetterDocument(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/certificate",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await certificateDisplayAdaptor.renderCertificatePage(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/claims/:claimId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimId },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimIdParam = claimId as string;

      try {
        await claimAssessmentAdaptor.renderClaimAssessmentPage(
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

  applicationRouter.post(
    "/:laaReference/claims/:claimId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
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
    "/:laaReference/claims/:claimId/rejected",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimId },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimIdParam = claimId as string;

      try {
        await claimAssessmentAdaptor.renderClaimRejectionSuccessPage(
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

  applicationRouter.get(
    "/:laaReference/claims/:claimId/evidence/:claimEvidenceId",
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

  applicationRouter.post(
    "/:laaReference/note",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.submitHistoryNote(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return applicationRouter;
}

export default createApplicationRouter;
