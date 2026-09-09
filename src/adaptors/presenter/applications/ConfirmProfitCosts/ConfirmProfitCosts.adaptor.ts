import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type {
  ConfirmProfitCostsForm,
  ConfirmProfitCostsFormErrors,
} from "./models/form.types.js";
import type { ConfirmProfitCostsValidator } from "./ConfirmProfitCosts.validator.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";

const SESSION_NAMESPACE = "claimApproval";

interface ErrorSummaryItem {
  text: string;
  href: string;
}

const ERROR_FIELD_HREFS: Array<{
  field: keyof ConfirmProfitCostsFormErrors;
  href: string;
}> = [
  { field: "totalRequired", href: "#net-total" },
  { field: "netTotal", href: "#net-total" },
  { field: "grossTotal", href: "#gross-total" },
  { field: "zeroVatTotal", href: "#zero-vat-total" },
];

export class ConfirmProfitCostsAdaptor {
  constructor(
    private readonly sessionHelper: SessionHelper,
    private readonly validator: ConfirmProfitCostsValidator,
  ) {}

  renderConfirmProfitCostsPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
    errorSummaries?: Partial<ConfirmProfitCostsFormErrors>,
    formValues?: Partial<ConfirmProfitCostsForm>,
  ): void {
    logger.logInfo({
      functionName: "render_confirm_profit_costs_page",
      message: "Confirm profit costs page requested",
      request: req,
      extraContext: {
        event: "confirm_profit_costs_page_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const sessionData = this.sessionHelper.getSessionData(
      req,
      SESSION_NAMESPACE,
    );
    const totals = this.#resolveFormValues(formValues, sessionData);

    res.render("application/claims/confirm-profit-costs/index", {
      backUrl: `/applications/${laaReference}/claims/${claimId}`,
      laaReference,
      claimId,
      ...totals,
      ...(errorSummaries !== undefined && {
        errorSummaries,
        errorList: this.#buildErrorList(errorSummaries),
      }),
    });
  }

  #buildErrorList(
    errorSummaries: Partial<ConfirmProfitCostsFormErrors>,
  ): ErrorSummaryItem[] {
    const errorList: ErrorSummaryItem[] = [];

    ERROR_FIELD_HREFS.forEach(({ field, href }) => {
      const { [field]: error } = errorSummaries;
      if (error === undefined) {
        return;
      }
      if (errorList.some((item) => item.text === error.text)) {
        return;
      }
      errorList.push({ text: error.text, href });
    });

    return errorList;
  }

  #resolveFormValues(
    formValues: Partial<ConfirmProfitCostsForm> | undefined,
    sessionData: Record<string, string> | null,
  ): { netTotal: string; grossTotal: string; zeroVatTotal: string } {
    return {
      netTotal: this.#resolveFormOrSessionValue(
        formValues?.["net-total"],
        sessionData?.netTotal,
      ),
      grossTotal: this.#resolveFormOrSessionValue(
        formValues?.["gross-total"],
        sessionData?.grossTotal,
      ),
      zeroVatTotal: this.#resolveFormOrSessionValue(
        formValues?.["zero-vat-total"],
        sessionData?.zeroVatTotal,
      ),
    };
  }

  #resolveFormOrSessionValue(
    formValue: string | undefined,
    sessionValue: string | undefined,
  ): string {
    return formValue ?? sessionValue ?? "";
  }

  processConfirmProfitCostsForm(
    req: TypedRequest<ConfirmProfitCostsForm, ClaimIdParams>,
    res: Response,
  ): void {
    const {
      body: formBody,
      params: { laaReference, claimId },
    } = req;

    logger.logInfo({
      functionName: "process_confirm_profit_costs_form",
      message: "Confirm profit costs form submitted",
      request: req as unknown as Request,
      extraContext: {
        event: "confirm_profit_costs_form_submitted",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const errorSummaries =
      this.validator.validateConfirmProfitCostsForm(formBody);

    if (Object.keys(errorSummaries).length > EMPTY_ARR_LENGTH) {
      this.renderConfirmProfitCostsPage(
        req as unknown as Request,
        res,
        laaReference,
        claimId,
        errorSummaries,
        formBody,
      );
      return;
    }

    this.sessionHelper.storeSessionData(req, SESSION_NAMESPACE, {
      netTotal: formBody["net-total"].trim(),
      grossTotal: formBody["gross-total"].trim(),
      zeroVatTotal: formBody["zero-vat-total"].trim(),
    });

    res.redirect(
      `/applications/${laaReference}/claims/${claimId}/confirm-disbursement-costs`,
    );
  }
}
