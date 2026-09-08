import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";

const SESSION_NAMESPACE = "claimApproval";

export class CheckYourAnswersAdaptor {
  constructor(
    private readonly claimsPort: ClaimsPort,
    private readonly sessionHelper: SessionHelper,
    private readonly buildCheckYourAnswersViewUseCase: BuildCheckYourAnswersViewUseCase = new BuildCheckYourAnswersViewUseCase(),
  ) {}

  async renderCheckYourAnswersPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
  ): Promise<void> {
    logger.logInfo({
      functionName: "render_check_your_answers_page",
      message: "Check your answers page requested",
      request: req,
      extraContext: {
        event: "check_your_answers_page_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const sessionData = this.sessionHelper.getSessionData(
      req,
      SESSION_NAMESPACE,
    );

    const result = await this.buildCheckYourAnswersViewUseCase.execute({
      laaReference,
      claimId,
      claimsPort: this.claimsPort,
      accessToken: req.session.user?.accessToken,
      profitCosts: {
        netTotal: sessionData?.netTotal,
        grossTotal: sessionData?.grossTotal,
        zeroVatTotal: sessionData?.zeroVatTotal,
      },
      disbursementCosts: {
        netTotal: sessionData?.disbursementNetTotal,
        grossTotal: sessionData?.disbursementGrossTotal,
        zeroVatTotal: sessionData?.disbursementZeroVatTotal,
      },
    });

    if (result.status !== "SUCCESS") {
      throw new Error("Unable to build check your answers view");
    }

    res.render("application/claims/check-your-answers/index", {
      backUrl: `/applications/${laaReference}/claims/${claimId}`,
      ...result.data,
    });
  }

  async processFinishAssessingClaim(
    req: TypedRequest<Record<string, never>, ClaimIdParams>,
    res: Response,
  ): Promise<void> {
    const {
      params: { laaReference, claimId },
    } = req;

    logger.logInfo({
      functionName: "process_finish_assessing_claim",
      message: "Finish assessing claim form submitted",
      request: req as unknown as Request,
      extraContext: {
        event: "finish_assessing_claim_form_submitted",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    // Submission is not yet implemented; re-render the same page.
    await this.renderCheckYourAnswersPage(
      req as unknown as Request,
      res,
      laaReference,
      claimId,
    );
  }
}
