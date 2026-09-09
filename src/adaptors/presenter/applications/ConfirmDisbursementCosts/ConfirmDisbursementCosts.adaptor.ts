import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type {
  ConfirmDisbursementCostsForm,
  ConfirmDisbursementCostsFormErrors,
} from "./models/form.types.js";
import type { ConfirmDisbursementCostsValidator } from "./ConfirmDisbursementCosts.validator.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import { ClaimAssessmentNavigationHelper } from "#src/adaptors/presenter/applications/ClaimAssessmentNavigation.helper.js";

const SESSION_NAMESPACE = "claimApproval";

interface ErrorSummaryItem {
  text: string;
  href: string;
}

const ERROR_FIELD_HREFS: Array<{
  field: keyof ConfirmDisbursementCostsFormErrors;
  href: string;
}> = [
  { field: "totalRequired", href: "#net-total" },
  { field: "netTotal", href: "#net-total" },
  { field: "grossTotal", href: "#gross-total" },
  { field: "zeroVatTotal", href: "#zero-vat-total" },
];

export class ConfirmDisbursementCostsAdaptor {
  private readonly navigationHelper: ClaimAssessmentNavigationHelper;

  constructor(
    private readonly sessionHelper: SessionHelper,
    private readonly validator: ConfirmDisbursementCostsValidator,
  ) {
    this.navigationHelper = new ClaimAssessmentNavigationHelper(
      this.sessionHelper,
    );
  }

  renderConfirmDisbursementCostsPage(
    req: Request,
    res: Response,
    laaReference: string,
    claimId: string,
    errorSummaries?: Partial<ConfirmDisbursementCostsFormErrors>,
    formValues?: Partial<ConfirmDisbursementCostsForm>,
  ): void {
    logger.logInfo({
      functionName: "render_confirm_disbursement_costs_page",
      message: "Confirm disbursement costs page requested",
      request: req,
      extraContext: {
        event: "confirm_disbursement_costs_page_requested",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    this.navigationHelper.syncChangeLinkReturnFlag(req);

    const sessionData = this.sessionHelper.getSessionData(
      req,
      SESSION_NAMESPACE,
    );
    const totals = this.#resolveFormValues(formValues, sessionData);

    res.render("application/claims/confirm-disbursement-costs/index", {
      backUrl: this.navigationHelper.resolveBackLinkUrl(
        req,
        `/applications/${laaReference}/claims/${claimId}/check-your-answers`,
        `/applications/${laaReference}/claims/${claimId}/confirm-profit-costs`,
      ),
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
    errorSummaries: Partial<ConfirmDisbursementCostsFormErrors>,
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
    formValues: Partial<ConfirmDisbursementCostsForm> | undefined,
    sessionData: Record<string, string> | null,
  ): { netTotal: string; grossTotal: string; zeroVatTotal: string } {
    return {
      netTotal: this.#resolveFormOrSessionValue(
        formValues?.["net-total"],
        sessionData?.disbursementNetTotal,
      ),
      grossTotal: this.#resolveFormOrSessionValue(
        formValues?.["gross-total"],
        sessionData?.disbursementGrossTotal,
      ),
      zeroVatTotal: this.#resolveFormOrSessionValue(
        formValues?.["zero-vat-total"],
        sessionData?.disbursementZeroVatTotal,
      ),
    };
  }

  #resolveFormOrSessionValue(
    formValue: string | undefined,
    sessionValue: string | undefined,
  ): string {
    return formValue ?? sessionValue ?? "";
  }

  processConfirmDisbursementCostsForm(
    req: TypedRequest<ConfirmDisbursementCostsForm, ClaimIdParams>,
    res: Response,
  ): void {
    const {
      body: formBody,
      params: { laaReference, claimId },
    } = req;

    logger.logInfo({
      functionName: "process_confirm_disbursement_costs_form",
      message: "Confirm disbursement costs form submitted",
      request: req as unknown as Request,
      extraContext: {
        event: "confirm_disbursement_costs_form_submitted",
        laa_reference: laaReference,
        claim_reference: claimId,
      },
    });

    const errorSummaries =
      this.validator.validateConfirmDisbursementCostsForm(formBody);

    if (Object.keys(errorSummaries).length > EMPTY_ARR_LENGTH) {
      this.renderConfirmDisbursementCostsPage(
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
      disbursementNetTotal: formBody["net-total"].trim(),
      disbursementGrossTotal: formBody["gross-total"].trim(),
      disbursementZeroVatTotal: formBody["zero-vat-total"].trim(),
    });

    res.redirect(
      `/applications/${laaReference}/claims/${claimId}/check-your-answers`,
    );
  }
}
