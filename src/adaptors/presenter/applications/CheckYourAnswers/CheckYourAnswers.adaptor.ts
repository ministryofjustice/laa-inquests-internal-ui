import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
} from "#src/infrastructure/express/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const SESSION_NAMESPACE = "claimApproval";

export class CheckYourAnswersAdaptor {
  constructor(
    private readonly sessionHelper: SessionHelper,
    private readonly buildCheckYourAnswersViewUseCase: BuildCheckYourAnswersViewUseCase,
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

    if (result.status === "INVALID_INPUT") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.checkYourAnswers.invalidRequest,
      });
      return;
    } else if (result.status === "NOT_FOUND") {
      res.status(HTTP_NOT_FOUND).render("application/error", {
        status: HTTP_NOT_FOUND,
        error: en.pages.claimAssessment.notFound,
      });
      return;
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
