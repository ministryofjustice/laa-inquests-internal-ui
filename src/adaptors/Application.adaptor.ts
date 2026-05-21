import type { Request, Response } from "express";
import type { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
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

    const proceeding = application.proceedings[0];

    const applicationType = APPLICATION_TYPES.find(
      (t) => t.applicationTypeId === application.applicationType,
    )?.applicationTypeDescription;

    const certificateType = CERTIFICATE_TYPES.find(
      (t) => t.certificateTypeId === proceeding?.certificateType,
    )?.certificateTypeDescription;

    const clientRole = CLIENT_ROLES.find(
      (t) => t.clientRoleId === proceeding?.clientInvolvementType,
    )?.clientRoleDescription;

    const levelOfService = LEVEL_OF_SERVICE.find(
      (t) => t.levelOfServiceId === proceeding?.levelOfService,
    )?.levelOfServiceDescription;

    const scopeLimitation = SCOPE_OF_LIMITATION.find(
      (t) => t.scopeOfLimitationId === proceeding?.scopeLimitationHeading,
    )?.lscopeOfLimitationDescription;

    res.render("application/application-overview", {
      application,
      proceeding,
      applicationType,
      certificateType,
      clientRole,
      levelOfService,
      scopeLimitation,
    });
  }
}
