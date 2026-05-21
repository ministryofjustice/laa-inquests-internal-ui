import type { Request, Response } from "express";
import { getSessionData } from "#src/infrastructure/express/session/sessionHelpers.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";
import { toTitleCase } from "#src/utils/formatter.js";

export class ApplicationDecisionAdaptor {
  constructor(private readonly viewApplicationAdaptor: ViewApplicationPort) {}

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
  ): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/overview`;

    const data =
      await this.viewApplicationAdaptor.getApplication(applicationId);
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
      overallDecision: getSessionData(req, "decision")?.overallDecision,
    });
  }
}
