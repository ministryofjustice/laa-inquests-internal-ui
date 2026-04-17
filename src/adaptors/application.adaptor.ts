import type { Request, Response } from "express";
import type { ApplicationDataStoreAdaptor } from "#src/adaptors/dataStoreApplication.adaptor.js";

export class ApplicationDisplayAdaptor {
  applicationDataStore: ApplicationDataStoreAdaptor;

  constructor(applicationDataStore: ApplicationDataStoreAdaptor) {
    this.applicationDataStore = applicationDataStore;
  }

  async renderApplicationPage(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    const displayApplication = await this.applicationDataStore.getApplication(applicationId);
    console.log(displayApplication);
    res.render("application/index", {
      displayApplication
    });
  }
}
