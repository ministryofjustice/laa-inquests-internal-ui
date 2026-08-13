import type { Request, Response } from "express";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import { DISPOSITION } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ClaimAssessmentAdaptor {
  constructor(
    private readonly applicationPort: ApplicationPort,
    private readonly claimsPort: ClaimsPort,
    private readonly buildClaimAssessmentViewUseCase: BuildClaimAssessmentViewUseCase = new BuildClaimAssessmentViewUseCase(),
  ) {}

  async renderClaimAssessmentPage(
    req: Request,
    res: Response,
    applicationId: string,
    claimId: string,
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
