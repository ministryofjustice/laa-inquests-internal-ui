import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { toTitleCase } from "#src/utils/formatter.js";
import type {
  TypedRequest,
  IdParams,
} from "#src/infrastructure/express/api.types.js";
import type {
  ApplicationDecisionForm,
  JustificationForm,
} from "./models/form.types.js";
import type { ApplicationDecisionValidator } from "./ApplicationDecision.validator.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";

export class ApplicationDecisionAdaptor {
  constructor(
    private readonly viewApplicationAdaptor: ApplicationPort,
    private readonly sessionHelper: SessionHelper,
    private readonly validator: ApplicationDecisionValidator,
  ) {}

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
    showOverallDecisionError = false,
  ): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/overview`;

    const data =
      await this.viewApplicationAdaptor.getApplication(applicationId);

    if (!data.proceedings.length) {
      throw new Error("Application has no proceedings");
    }

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- only want first item
    const firstProceeding = data.proceedings[0];
    const formattedProceeding = {
      certificateType: toTitleCase(firstProceeding.certificateType),
      meritsDecision: toTitleCase(data.overallDecision ?? "PENDING"),
    };

    this.sessionHelper.storeSessionData(req, "decision", formattedProceeding);

    res.render("application/decision/index", {
      backUrl,
      applicationId,
      proceeding: formattedProceeding,
      overallDecision: this.sessionHelper.getSessionData(req, "decision")
        ?.overallDecision,
      showOverallDecisionError,
    });
  }

  processApplicationDecisionForm(
    req: TypedRequest<ApplicationDecisionForm, IdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId },
    } = req;
    const {
      body: { "overall-decision": overallDecision },
    } = req;

    if (!overallDecision) {
      const backUrl = `/applications/${applicationId}/overview`;
      const sessionData =
        this.sessionHelper.getSessionData(
          req as unknown as Request,
          "decision",
        ) ?? {};

      res.render("application/decision/index", {
        backUrl,
        applicationId,
        proceeding: {
          certificateType: sessionData.certificateType,
          meritsDecision: sessionData.meritsDecision,
        },
        overallDecision: sessionData.overallDecision,
        showOverallDecisionError: true,
      });
      return;
    }

    this.sessionHelper.storeSessionData(req, "decision", { overallDecision });
    res.redirect(`/applications/${applicationId}/decision/justification`);
  }

  renderJustificationForm(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision`;
    const sessionData = this.sessionHelper.getSessionData(req, "decision");
    res.render("application/decision/justification/index", {
      backUrl,
      laaReference: applicationId,
      refusalReason: sessionData?.refusalReason,
      justification: sessionData?.justification,
    });
  }

  processJustificationForm(
    req: TypedRequest<JustificationForm, IdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId },
    } = req;
    const {
      body: { "refusal-reason": refusalReason, justification },
    } = req;

    const sessionData = this.sessionHelper.getSessionData(
      req as unknown as Request,
      "decision",
    );

    const errorSummaries = this.validator.validateJustification(req.body);

    if (Object.keys(errorSummaries).length > EMPTY_ARR_LENGTH) {
      const backUrl = `/applications/${applicationId}/decision`;
      res.render("application/decision/justification/index", {
        backUrl,
        laaReference: applicationId,
        refusalReason: sessionData?.refusalReason,
        justification: sessionData?.justification,
        errorSummaries,
      });
      return;
    }

    this.sessionHelper.storeSessionData(req, "decision", {
      ...sessionData,
      refusalReason,
      justification,
    });
    res.redirect(`/applications/${applicationId}/decision/confirmation`);
  }

  renderConfirmationPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision/justification`;
    const sessionData =
      this.sessionHelper.getSessionData(req, "decision") ?? {};

    const refusalReasonLabels: Record<string, string> = {
      "not-in-scope": "Not in scope",
      "insufficient-information": "Insufficient information",
      "duplicate-case": "Duplicate case",
    };

    const refusalReasonLabel =
      refusalReasonLabels[sessionData.refusalReason] ??
      sessionData.refusalReason;

    res.render("application/decision/confirmation/index", {
      backUrl,
      applicationId,
      proceeding: sessionData,
      overallDecision: sessionData.overallDecision,
      refusalReasonLabel,
      justification: sessionData.justification,
    });
  }

  async processConfirmationForm(req: Request, res: Response): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const sessionData =
      this.sessionHelper.getSessionData(req, "decision") ?? {};

    await this.viewApplicationAdaptor.submitMeritsDecision(
      applicationId,
      sessionData.overallDecision,
    );

    res.redirect(`/applications/${applicationId}/decision/success`);
  }

  renderDecisionSuccessPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision/confirmation`;
    this.sessionHelper.clearSessionData(req, "decision");
    res.render("application/decision/success/index", {
      applicationId,
      backUrl,
    });
  }
}
