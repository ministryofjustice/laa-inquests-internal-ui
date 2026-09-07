import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { ConfirmProfitCostsForm } from "./models/form.types.js";

export class ConfirmProfitCostsAdaptor {
  renderConfirmProfitCostsPage(
    req: Request,
    res: Response,
    applicationId: string,
    claimId: string,
  ): void {
    logger.logInfo({
      functionName: "render_confirm_profit_costs_page",
      message: "Confirm profit costs page requested",
      request: req,
      extraContext: {
        event: "confirm_profit_costs_page_requested",
        laa_reference: applicationId,
        claim_reference: claimId,
      },
    });

    res.render("application/claims/confirm-profit-costs/index", {
      backUrl: `/applications/${applicationId}/claims/${claimId}`,
      applicationId,
      claimId,
    });
  }

  processConfirmProfitCostsForm(
    req: TypedRequest<ConfirmProfitCostsForm, ClaimIdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId, claimId },
    } = req;

    logger.logInfo({
      functionName: "process_confirm_profit_costs_form",
      message: "Confirm profit costs form submitted",
      request: req as unknown as Request,
      extraContext: {
        event: "confirm_profit_costs_form_submitted",
        laa_reference: applicationId,
        claim_reference: claimId,
      },
    });

    this.renderConfirmProfitCostsPage(
      req as unknown as Request,
      res,
      applicationId,
      claimId,
    );
  }
}
