import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type {
  DisbursementCostsForm,
  DisbursementCostsFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import type { ConfirmDisbursementCostsValidator } from "./ConfirmDisbursementCosts.validator.js";
import { ProcessDisbursementCostsUseCase } from "#src/use-cases/applications/claims/ProcessDisbursementCosts.useCase.js";

const SESSION_NAMESPACE = "disbursementCosts";

export class ConfirmDisbursementCostsAdaptor {
  constructor(
    private readonly sessionHelper: SessionHelper,
    private readonly validator: ConfirmDisbursementCostsValidator,
    private readonly processDisbursementCostsUseCase: ProcessDisbursementCostsUseCase = new ProcessDisbursementCostsUseCase(),
  ) {}

  renderDisbursementCostsForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<DisbursementCostsFormErrors>,
    values?: DisbursementCostsForm,
  ): void {
    const applicationId = req.params.applicationId as string;
    const claimId = req.params.claimId as string;

    res.render("application/claims/disbursement-costs/index", {
      backUrl: `/applications/${applicationId}/claims/${claimId}`,
      applicationId,
      claimId,
      vatZero: values?.["disbursement-cost-vat-zero"],
      net: values?.["disbursement-cost-net"],
      gross: values?.["disbursement-cost-gross"],
      ...(errorSummaries && { errorSummaries }),
    });
  }

  processDisbursementCostsForm(
    req: TypedRequest<DisbursementCostsForm, ClaimIdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId, claimId },
      body,
    } = req;

    const form: DisbursementCostsForm = {
      "disbursement-cost-vat-zero": body["disbursement-cost-vat-zero"],
      "disbursement-cost-net": body["disbursement-cost-net"],
      "disbursement-cost-gross": body["disbursement-cost-gross"],
    };

    this.sessionHelper.storeSessionData(req, SESSION_NAMESPACE, {
      "disbursement-cost-vat-zero": form["disbursement-cost-vat-zero"],
      "disbursement-cost-net": form["disbursement-cost-net"],
      "disbursement-cost-gross": form["disbursement-cost-gross"],
    });

    const result = this.processDisbursementCostsUseCase.execute({
      form,
      validate: (submittedForm) =>
        this.validator.validateDisbursementCostsForm(submittedForm),
    });

    if (result.status === "VALIDATION_FAILED") {
      this.renderDisbursementCostsForm(
        req as unknown as Request,
        res,
        result.validationErrors,
        form,
      );
      return;
    }

    res.redirect(`/applications/${applicationId}/claims/${claimId}`);
  }
}
