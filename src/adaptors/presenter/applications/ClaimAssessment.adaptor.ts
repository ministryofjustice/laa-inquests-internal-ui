import type { Request, Response } from "express";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildClaimAssessmentViewUseCase } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";

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
}
