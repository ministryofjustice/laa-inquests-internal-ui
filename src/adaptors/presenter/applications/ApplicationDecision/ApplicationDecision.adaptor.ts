import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";
import { toTitleCase } from "#src/utils/formatter.js";

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
      meritsDecision: toTitleCase(firstProceeding.meritsDecision),
    };

    res.render("application/decision/index", {
      backUrl,
      applicationId,
      proceeding: formattedProceeding,
      overallDecision: this.sessionHelper.getSessionData(req, "decision")
        ?.overallDecision,
    });
  }

  processApplicationDecisionForm(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const { "overall-decision": overallDecision } = req.body as Record<
      string,
      string
    >;

    this.sessionHelper.storeSessionData(req, "decision", { overallDecision });
    res.redirect(`/applications/${applicationId}/decision/justification`);
  }
}
