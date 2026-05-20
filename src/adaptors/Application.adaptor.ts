import type { Request, Response } from "express";
import type { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ApplicationAdaptor {
  viewApplicationAdaptor: ViewApplicationAdaptor;

  constructor(viewApplicationAdaptor: ViewApplicationAdaptor) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
  }

  async renderApplicationPage(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    logger.logInfo(
      "GET Application by ID",
      `Application with ID: ${applicationId} has been accessed.`,
      req,
    );
    const application =
      await this.viewApplicationAdaptor.getApplication(applicationId);
    res.render("application/application-overview", {
      application,
    });
  }
}
