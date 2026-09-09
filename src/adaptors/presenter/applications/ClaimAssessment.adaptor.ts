import type { Request, Response } from "express";
import type { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import type { BuildClaimRejectionViewUseCase } from "#src/use-cases/applications/claims/BuildClaimRejectionView.useCase.js";
import { ProcessClaimAssessmentUseCase } from "#src/use-cases/applications/claims/ProcessClaimAssessment.useCase.js";
import type { RejectClaimUseCase } from "#src/use-cases/applications/claims/RejectClaim.useCase.js";
import { ClaimAssessmentValidator } from "#src/adaptors/presenter/applications/ClaimAssessment.validator.js";
import { ClaimAssessmentNavigationHelper } from "#src/adaptors/presenter/applications/ClaimAssessmentNavigation.helper.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import {
  CLAIM_DECISION_STATUSES,
  DISPOSITION,
} from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import type {
  AssessClaimForm,
  AssessClaimFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { GetClaimEvidenceUseCase } from "#src/use-cases/applications/claims/GetClaimEvidence.useCase.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
} from "#src/infrastructure/express/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const REJECT_DECISION: string = CLAIM_DECISION_STATUSES.REJECT;

export class ClaimAssessmentAdaptor {
  private readonly navigationHelper: ClaimAssessmentNavigationHelper;

  constructor(
    private readonly sessionHelper: SessionHelper,
    private readonly buildClaimAssessmentViewUseCase: BuildClaimAssessmentViewUseCase,
    private readonly rejectClaimUseCase: RejectClaimUseCase,
    private readonly buildClaimRejectionViewUseCase: BuildClaimRejectionViewUseCase,
    private readonly getClaimEvidenceUseCase: GetClaimEvidenceUseCase,
    private readonly validator: ClaimAssessmentValidator = new ClaimAssessmentValidator(),
    private readonly processClaimAssessmentUseCase: ProcessClaimAssessmentUseCase = new ProcessClaimAssessmentUseCase(),
  ) {
    this.navigationHelper = new ClaimAssessmentNavigationHelper(
      this.sessionHelper,
    );
  }

  async renderClaimAssessmentPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
    errorSummaries?: Partial<AssessClaimFormErrors>,
    assessClaim?: string,
    rejectionReason?: string,
  ): Promise<void> {
    logger.logInfo({
      functionName: "render_claim_assessment_page",
      message: "Claim assessment page requested",
      request: req,
      extraContext: {
        event: "claim_assessment_page_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    this.navigationHelper.clearChangeLinkReturnOnFreshVisit(req);

    const claimAssessmentViewResult =
      await this.buildClaimAssessmentViewUseCase.execute({
        laaReference,
        claimId,
        accessToken: req.session.user?.accessToken,
      });

    if (claimAssessmentViewResult.status === "INVALID_INPUT") {
      res.status(400).render("application/error", {
        status: 400,
        error: en.pages.claimAssessment.invalidRequest,
      });
      return;
    } else if (claimAssessmentViewResult.status === "NOT_FOUND") {
      res.status(404).render("application/error", {
        status: 404,
        error: en.pages.claimAssessment.notFound,
      });
      return;
    }

    res.render("application/claims/assess/index", {
      backUrl: `/applications/${laaReference}/overview`,
      ...claimAssessmentViewResult.data,
      assessClaim,
      rejectionReason,
      ...(errorSummaries && { errorSummaries }),
    });
  }

  async processClaimAssessmentForm(
    req: TypedRequest<AssessClaimForm, ClaimIdParams>,
    res: Response,
  ): Promise<void> {
    const {
      body: { assessClaim, "rejection-reason": rejectionReason },
      params: { laaReference, claimId },
    } = req;
    logger.logInfo({
      functionName: "process_claim_assessment_form",
      message: "Claim assessment form submitted",
      request: req as unknown as Request,
      extraContext: {
        event: "claim_assessment_form_submitted",
        laa_reference: laaReference,
        claim_reference: claimId,
        has_rejection_reason:
          typeof rejectionReason === "string" && rejectionReason.trim() !== "",
      },
    });

    const result = this.processClaimAssessmentUseCase.execute({
      assessClaim,
      rejectionReason,
      validate: (form) => this.validator.validateAssessClaimForm(form),
    });

    if (result.status === "VALIDATION_FAILED") {
      await this.renderClaimAssessmentPage(
        req as unknown as Request,
        res,
        laaReference,
        claimId,
        result.validationErrors,
        assessClaim,
        rejectionReason,
      );
      return;
    }

    if (assessClaim === REJECT_DECISION) {
      const rejectResult = await this.rejectClaimUseCase.execute({
        laaReference,
        claimId,
        justification: rejectionReason,
        accessToken: req.session.user?.accessToken,
      });

      if (rejectResult.status === "INVALID_INPUT") {
        res.status(HTTP_BAD_REQUEST).render("application/error", {
          status: HTTP_BAD_REQUEST,
          error: en.pages.claimAssessment.invalidRequest,
        });
        return;
      }

      logger.logInfo({
        functionName: "process_claim_assessment_form",
        message: "Claim rejected",
        request: req as unknown as Request,
        extraContext: {
          event: "claim_rejected",
          laa_reference: laaReference,
          claim_reference: claimId,
        },
      });

      res.redirect(`/applications/${laaReference}/claims/${claimId}/rejected`);
      return;
    }

    res.redirect(
      `/applications/${laaReference}/claims/${claimId}/confirm-profit-costs`,
    );
  }

  async renderClaimRejectionSuccessPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
  ): Promise<void> {
    logger.logInfo({
      functionName: "render_claim_rejection_success_page",
      message: "Claim rejection success page requested",
      extraContext: {
        event: "claim_rejection_success_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const claimRejectionViewResult =
      await this.buildClaimRejectionViewUseCase.execute({
        laaReference,
        claimId,
        accessToken: req.session.user?.accessToken,
      });

    if (claimRejectionViewResult.status === "INVALID_INPUT") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.invalidRequest,
      });
      return;
    } else if (claimRejectionViewResult.status === "NOT_FOUND") {
      res.status(HTTP_NOT_FOUND).render("application/error", {
        status: HTTP_NOT_FOUND,
        error: en.pages.claimAssessment.notFound,
      });
      return;
    } else if (claimRejectionViewResult.status === "INVALID_CLAIM_TYPE") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.invalidClaimType,
      });
      return;
    }

    res.render("application/claims/rejected/index", {
      laaReference,
      claimType: claimRejectionViewResult.data.claimType,
    });
  }

  async serveClaimEvidence(
    req: Request,
    res: Response,
    claimEvidenceId: string,
    disposition: string,
  ): Promise<void> {
    if (
      disposition === DISPOSITION.INLINE ||
      disposition === DISPOSITION.ATTACHMENT
    ) {
      logger.logInfo({
        functionName: "serve_claim_evidence",
        message: "Claim evidence requested",
        request: req,
        extraContext: {
          event: "claim_evidence_requested",
          claim_evidence_id: claimEvidenceId,
          disposition,
        },
      });

      const result = await this.getClaimEvidenceUseCase.execute({
        claimEvidenceId,
        disposition,
        accessToken: req.session.user?.accessToken,
      });
      if (result.status === "NOT_FOUND") {
        logger.logWarn({
          functionName: "serve_claim_evidence",
          message: "Claim evidence not found",
          request: req,
          extraContext: {
            event: "claim_evidence_not_found",
            claimEvidenceId,
            disposition,
            status_code: HTTP_NOT_FOUND,
          },
        });
        res.status(HTTP_NOT_FOUND).render("application/error", {
          status: HTTP_NOT_FOUND,
          error: en.pages.claimAssessment.evidence.notFound,
        });
        return;
      } else if (result.status === "INVALID_INPUT") {
        res.status(HTTP_BAD_REQUEST).render("application/error", {
          status: HTTP_BAD_REQUEST,
          error: en.pages.claimAssessment.evidence.invalidRequest,
        });
        return;
      }
      res.setHeader("Content-Type", result.data.contentType);
      res.setHeader("Content-Disposition", result.data.contentDisposition);
      res.send(result.data.data);
    } else {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.evidence.invalidRequest,
      });
    }
  }
}
