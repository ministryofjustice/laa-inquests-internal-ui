import type { Request, Response } from "express";
import type { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import type { Application } from "#src/adaptors/models/application.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { formatCurrency } from "#src/utils/formatter.js";
import {
  APPLICATION_TYPES,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVEL_OF_SERVICE,
  SCOPE_OF_LIMITATION,
} from "#src/infrastructure/locales/constants.js";

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

    const proceedings = mapProceedings(application.proceedings);

    const applicationType = APPLICATION_TYPES.find(
      (t) => t.applicationTypeId === application.applicationType,
    )?.applicationTypeDescription;

    res.render("application/application-overview", {
      application,
      proceedings,
      applicationType,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- temporary disable for merge
function mapProceedings(proceedings: Application["proceedings"]) {
  return proceedings.map((p) => ({
    ...p,
    certificateType: CERTIFICATE_TYPES.find(
      (t) => t.certificateTypeId === p.certificateType,
    )?.certificateTypeDescription,
    clientInvolvementType: CLIENT_ROLES.find(
      (t) => t.clientRoleId === p.clientInvolvementType,
    )?.clientRoleDescription,
    levelOfService: LEVEL_OF_SERVICE.find(
      (t) => t.levelOfServiceId === p.levelOfService,
    )?.levelOfServiceDescription,
    scopeLimitationHeading: SCOPE_OF_LIMITATION.find(
      (t) => t.scopeOfLimitationId === p.scopeLimitationHeading,
    )?.lscopeOfLimitationDescription,
    substantiveCostLimitation: formatCurrency(p.substantiveCostLimitation),
  }));
}
