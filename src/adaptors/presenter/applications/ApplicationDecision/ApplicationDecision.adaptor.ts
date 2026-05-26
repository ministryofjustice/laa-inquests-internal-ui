import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";
import { toTitleCase } from "#src/utils/formatter.js";
import type {
  TypedRequest,
  IdParams,
} from "#src/infrastructure/express/api.types.js";
import type { ApplicationDecisionForm } from "./models/form.types.js";

export class ApplicationDecisionAdaptor {
  constructor(
    private readonly viewApplicationAdaptor: ViewApplicationPort,
    private readonly sessionHelper: SessionHelper,
  ) {}

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
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

    this.sessionHelper.storeSessionData(req, "decision", { overallDecision });
    res.redirect(`/applications/${applicationId}/decision/justification`);
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
