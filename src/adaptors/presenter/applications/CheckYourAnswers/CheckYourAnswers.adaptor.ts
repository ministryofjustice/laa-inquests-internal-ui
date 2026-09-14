import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { BuildCheckYourAnswersViewUseCase } from "#src/use-cases/applications/claims/BuildCheckYourAnswersView.useCase.js";
import type { PayInFullClaimUseCase } from "#src/use-cases/applications/claims/PayInFullClaim.useCase.js";
import type { BuildClaimPaidInFullViewUseCase } from "#src/use-cases/applications/claims/BuildClaimPaidInFullView.useCase.js";
import type { PayInFullClaimData } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
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
    private readonly payInFullClaimUseCase: PayInFullClaimUseCase,
    private readonly buildClaimPaidInFullViewUseCase: BuildClaimPaidInFullViewUseCase,
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
      backUrl: `/applications/${laaReference}/claims/${claimId}/confirm-disbursement-costs`,
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

    const sessionData = this.sessionHelper.getSessionData(
      req as unknown as Request,
      SESSION_NAMESPACE,
    );

    const data = this.#buildPayInFullData(sessionData);

    const result = await this.payInFullClaimUseCase.execute({
      laaReference,
      claimId,
      data,
      accessToken: (req as unknown as Request).session.user?.accessToken,
    });

    if (result.status === "INVALID_INPUT") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.checkYourAnswers.invalidRequest,
      });
      return;
    }

    logger.logInfo({
      functionName: "process_finish_assessing_claim",
      message: "Claim paid in full",
      request: req as unknown as Request,
      extraContext: {
        event: "claim_paid_in_full",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    res.redirect(
      `/applications/${laaReference}/claims/${claimId}/paid-in-full`,
    );
  }

  async renderClaimPaidInFullSuccessPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
  ): Promise<void> {
    logger.logInfo({
      functionName: "render_claim_paid_in_full_success_page",
      message: "Claim paid in full success page requested",
      extraContext: {
        event: "claim_paid_in_full_success_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const claimPaidInFullViewResult =
      await this.buildClaimPaidInFullViewUseCase.execute({
        laaReference,
        claimId,
        accessToken: req.session.user?.accessToken,
      });

    if (claimPaidInFullViewResult.status === "INVALID_INPUT") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.checkYourAnswers.invalidRequest,
      });
      return;
    } else if (claimPaidInFullViewResult.status === "NOT_FOUND") {
      res.status(HTTP_NOT_FOUND).render("application/error", {
        status: HTTP_NOT_FOUND,
        error: en.pages.claimAssessment.notFound,
      });
      return;
    } else if (claimPaidInFullViewResult.status === "INVALID_CLAIM_TYPE") {
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.claimAssessment.invalidClaimType,
      });
      return;
    }

    res.render("application/claims/paid-in-full/index", {
      laaReference,
      claimType: claimPaidInFullViewResult.data.claimType,
    });
  }

  #buildPayInFullData(
    sessionData: Record<string, string> | null,
  ): PayInFullClaimData {
    const fieldMap: Record<keyof PayInFullClaimData, string> = {
      profitCostNet: "netTotal",
      profitCostGross: "grossTotal",
      profitCostVatZero: "zeroVatTotal",
      disbursementNet: "disbursementNetTotal",
      disbursementGross: "disbursementGrossTotal",
      disbursementVatZero: "disbursementZeroVatTotal",
    };

    const data: PayInFullClaimData = {};
    for (const [apiField, sessionField] of Object.entries(fieldMap) as Array<
      [keyof PayInFullClaimData, string]
    >) {
      const value = sessionData?.[sessionField];
      if (typeof value === "string" && value.trim() !== "") {
        data[apiField] = Number(value);
      }
    }
    return data;
  }
}
