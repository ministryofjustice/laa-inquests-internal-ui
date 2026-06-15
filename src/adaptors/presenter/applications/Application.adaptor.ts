import type { Request, Response } from "express";
import type { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";

export class ApplicationAdaptor {
  viewApplicationAdaptor: ApplicationAPIAdaptor;

  private readonly buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase;

  constructor(
    viewApplicationAdaptor: ApplicationAPIAdaptor,
    buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase = new BuildApplicationOverviewViewUseCase(),
  ) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
    this.buildApplicationOverviewViewUseCase =
      buildApplicationOverviewViewUseCase;
  }

  async renderApplicationPage(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    const { viewApplicationAdaptor, buildApplicationOverviewViewUseCase } =
      this;

    logger.logInfo(
      "GET Application by ID",
      `Application with ID: ${applicationId} has been accessed.`,
      req,
    );

    // COPILOT TODO: This adaptor use should be within the use case
    const application =
      await viewApplicationAdaptor.getApplication(applicationId);
    const overviewViewResult =
      buildApplicationOverviewViewUseCase.execute(application);

    if (overviewViewResult.status !== "SUCCESS") {
      throw new Error("Unable to build application overview view");
    }

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- false positive on already-destructured payload
    const {
      application: mappedApplication,
      proceedings,
      clientHomeAddressDisplay,
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      statusTag,
    } = overviewViewResult.data;

    res.render("application/application-overview", {
      application: mappedApplication,
      proceedings,
      clientHomeAddressDisplay,
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      statusTag,
      backUrl: "#",
    });
  }
}
