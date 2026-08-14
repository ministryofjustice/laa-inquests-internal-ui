import type { Request, Response } from "express";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import { ProcessClaimAssessmentUseCase } from "#src/use-cases/applications/claims/ProcessClaimAssessment.useCase.js";
import { ClaimAssessmentValidator } from "#src/adaptors/presenter/applications/ClaimAssessment.validator.js";
import { DISPOSITION } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type {
  AssessClaimForm,
  AssessClaimFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

export class ClaimAssessmentAdaptor {
  constructor(
    private readonly applicationPort: ApplicationPort,
    private readonly claimsPort: ClaimsPort,
    private readonly buildClaimAssessmentViewUseCase: BuildClaimAssessmentViewUseCase = new BuildClaimAssessmentViewUseCase(),
    private readonly validator: ClaimAssessmentValidator = new ClaimAssessmentValidator(),
    private readonly processClaimAssessmentUseCase: ProcessClaimAssessmentUseCase = new ProcessClaimAssessmentUseCase(),
  ) {}

  async renderClaimAssessmentPage(
    req: Request,
    res: Response,
    applicationId: string,
    claimId: string,
    errorSummaries?: Partial<AssessClaimFormErrors>,
    assessClaim?: string,
    rejectionReason?: string,
  ): Promise<void> {
    const claimAssessmentViewResult =
      await this.buildClaimAssessmentViewUseCase.execute({
        applicationId,
        claimId,
        applicationPort: this.applicationPort,
        claimsPort: this.claimsPort,
        accessToken: req.session.user?.accessToken,
      });

    if (claimAssessmentViewResult.status !== "SUCCESS") {
      throw new Error("Unable to build claim assessment view");
    }

    res.render("application/claims/assess/index", {
      backUrl: `/applications/${applicationId}/overview`,
      applicationId,
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
      params: { applicationId, claimId },
    } = req;

    const result = this.processClaimAssessmentUseCase.execute({
      assessClaim,
      rejectionReason,
      validate: (form) => this.validator.validateAssessClaimForm(form),
    });

    if (result.status === "VALIDATION_FAILED") {
      await this.renderClaimAssessmentPage(
        req as unknown as Request,
        res,
        applicationId,
        claimId,
        result.validationErrors,
        assessClaim,
        rejectionReason,
      );
      return;
    }

    res.redirect(`/applications/${applicationId}/overview`);
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
      logger.logInfo(
        "GET Claim Evidence",
        `Claim evidence ${claimEvidenceId} requested.`,
        req,
      );

      try {
        const { data, contentType, contentDisposition } =
          await this.claimsPort.getClaimEvidence(
            claimEvidenceId,
            disposition,
            req.session.user?.accessToken,
          );

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", contentDisposition);
        res.send(data);
      } catch (error) {
        logger.logError(
          "GET Claim Evidence",
          `Failed to retrieve claim evidence ${claimEvidenceId}`,
          error,
          req,
        );

        res.status(500).render("application/error", {
          status: "Unable to retrieve evidence",
          error: "Unable to retrieve evidence. Please try again later",
        });
      }
    } else {
      res.status(400).render("application/error", {
        status: "Invalid request",
        error: "Unable to retrieve evidence. Please try again later",
      });
    }
  }
}
