import type { Request, Response } from "express";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";

interface AssessClaimFormErrors {
  assessClaim: {
    text: string;
  };
}

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
    errorSummaries?: Partial<AssessClaimFormErrors>,
    assessClaim?: string,
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
      ...(errorSummaries && { errorSummaries }),
    });
  }

  async processClaimAssessmentPage(
    req: Request,
    res: Response,
    applicationId: string,
    claimId: string,
  ): Promise<void> {
    const { assessClaim } = req.body as { assessClaim?: string };

    if (assessClaim) {
      res.redirect(
        `/applications/${applicationId}/claims/${claimId}/confirmation`,
      );
    } else {
      await this.renderClaimAssessmentPage(
        req,
        res,
        applicationId,
        claimId,
        {
          assessClaim: {
            text: en.pages.claimAssessment.radio.validationError,
          },
        },
        assessClaim,
      );
    }
  }

  renderClaimAssessmentConfirmationPage(
    req: Request,
    res: Response,
    applicationId: string,
    claimId: string,
  ): void {
    res.render("application/claims/assess/confirmation/index", {
      backUrl: `/applications/${applicationId}/claims/${claimId}`,
      applicationId,
      claimId,
    });
  }
}
