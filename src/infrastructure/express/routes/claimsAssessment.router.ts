import type { NextFunction, Request, Response, Router } from "express";
import type { CheckYourAnswersAdaptor } from "#src/adaptors/presenter/applications/CheckYourAnswers/CheckYourAnswers.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { ConfirmProfitCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.adaptor.js";
import type { ConfirmProfitCostsForm } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/models/form.types.js";
import type { ConfirmDisbursementCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.adaptor.js";
import type { ConfirmDisbursementCostsForm } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/models/form.types.js";
import type { ClaimAssessmentAdaptor } from "#src/adaptors/presenter/applications/ClaimAssessment.adaptor.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";

export function createClaimsAssessmentRouter(
  claimsAssessmentRouter: Router,
  claimAssessmentAdaptor: ClaimAssessmentAdaptor,
  confirmProfitCostsAdaptor: ConfirmProfitCostsAdaptor,
  confirmDisbursementCostsAdaptor: ConfirmDisbursementCostsAdaptor,
  checkYourAnswersAdaptor: CheckYourAnswersAdaptor,
): Router {
  claimsAssessmentRouter.get(
    "/:claimReference",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      try {
        await claimAssessmentAdaptor.renderClaimAssessmentPage(
          req,
          res,
          laaReferenceParam,
          claimReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  claimsAssessmentRouter.post(
    "/:claimReference",
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

  claimsAssessmentRouter.get(
    "/:claimReference/rejected",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      try {
        await claimAssessmentAdaptor.renderClaimRejectionSuccessPage(
          req,
          res,
          laaReferenceParam,
          claimReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  claimsAssessmentRouter.get(
    "/:claimReference/evidence/:claimEvidenceId",
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

  claimsAssessmentRouter.get(
    "/:claimReference/confirm-profit-costs",
    (req: Request, res: Response): void => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      confirmProfitCostsAdaptor.renderConfirmProfitCostsPage(
        req,
        res,
        laaReferenceParam,
        claimReferenceParam,
      );
    },
  );

  claimsAssessmentRouter.post(
    "/:claimReference/confirm-profit-costs",
    (req: Request, res: Response): void => {
      confirmProfitCostsAdaptor.processConfirmProfitCostsForm(
        req as unknown as TypedRequest<ConfirmProfitCostsForm, ClaimIdParams>,
        res,
      );
    },
  );

  claimsAssessmentRouter.get(
    "/:claimReference/confirm-disbursement-costs",
    (req: Request, res: Response): void => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      confirmDisbursementCostsAdaptor.renderConfirmDisbursementCostsPage(
        req,
        res,
        laaReferenceParam,
        claimReferenceParam,
      );
    },
  );

  claimsAssessmentRouter.post(
    "/:claimReference/confirm-disbursement-costs",
    (req: Request, res: Response): void => {
      confirmDisbursementCostsAdaptor.processConfirmDisbursementCostsForm(
        req as unknown as TypedRequest<
          ConfirmDisbursementCostsForm,
          ClaimIdParams
        >,
        res,
      );
    },
  );

  claimsAssessmentRouter.get(
    "/:claimReference/check-your-answers",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      try {
        await checkYourAnswersAdaptor.renderCheckYourAnswersPage(
          req,
          res,
          laaReferenceParam,
          claimReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  claimsAssessmentRouter.post(
    "/:claimReference/check-your-answers",
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

  claimsAssessmentRouter.get(
    "/:claimReference/paid-in-full",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      try {
        await checkYourAnswersAdaptor.renderClaimPaidInFullSuccessPage(
          req,
          res,
          laaReferenceParam,
          claimReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return claimsAssessmentRouter;
}
