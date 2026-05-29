import type { Request, Response } from "express";
import type { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import type { Application, Proceeding } from "#src/adaptors/models/application.types.js";
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
  viewApplicationAdaptor: ApplicationAPIAdaptor;

  constructor(viewApplicationAdaptor: ApplicationAPIAdaptor) {
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
    const clientHomeAddressDisplay = getHomeAddressDisplay(application);
    const { clientCorrespondenceAddressDisplay, careOfRecipientDisplay } =
      getCorrespondenceDisplay(application, req);

    const applicationType =
      APPLICATION_TYPES.find(
        (t) => t.applicationTypeId === application.applicationType,
      )?.applicationTypeDescription ?? application.applicationType;

    application.applicationType = applicationType;

    const isPending =
      !application.overallDecision ||
      application.overallDecision.toUpperCase() === "PENDING";

    const statusTag = isPending
      ? { text: "Awaiting assessment", classes: "govuk-tag--grey" }
      : { text: "Assessment complete", classes: "govuk-tag--green" };

    res.render("application/application-overview", {
      application,
      proceedings,
      clientHomeAddressDisplay,
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      statusTag,
      backUrl: "#",
    });
  }
}

function getHomeAddressDisplay(application: Application): string {
  if (application.client.hasNoFixedAbode) {
    return "No fixed abode";
  }

  if (!application.client.homeAddress) {
    return "Not provided";
  }

  return addressToHtml(application.client.homeAddress);
}

function getCorrespondenceDisplay(
  application: Application,
  req: Request,
): {
  clientCorrespondenceAddressDisplay: string;
  careOfRecipientDisplay?: string;
} {
  const careOfRecipientDisplay = application.correspondenceRecipient
    ? [
        application.correspondenceRecipient.recipientType,
        application.correspondenceRecipient.recipientName,
      ]
        .filter((line) => line && line.trim().length > 0)
        .map(escapeHtml)
        .join("<br>")
    : undefined;

  if (application.client.correspondenceAddressSource === "USE_CLIENT_HOME_ADDRESS") {
    return {
      clientCorrespondenceAddressDisplay: getHomeAddressDisplay(application),
      careOfRecipientDisplay,
    };
  }

  if (application.client.correspondenceAddressSource === "USE_PROVIDER_ADDRESS") {
    return {
      clientCorrespondenceAddressDisplay: "Provider office address",
      careOfRecipientDisplay,
    };
  }

  if (application.client.correspondenceAddressSource === "USE_SPECIFIED_ADDRESS") {
    if (!application.client.correspondenceAddress) {
      logger.logInfo(
        "ApplicationAdaptor.renderApplicationPage",
        `Expected specified correspondence address was missing for LAA reference ${application.laaReference}`,
        req,
      );

      return {
        clientCorrespondenceAddressDisplay: "Not provided",
        careOfRecipientDisplay,
      };
    }

    return {
      clientCorrespondenceAddressDisplay: addressToHtml(
        application.client.correspondenceAddress,
      ),
      careOfRecipientDisplay,
    };
  }

  logger.logInfo(
    "ApplicationAdaptor.renderApplicationPage",
    `Unknown correspondenceAddressSource '${application.client.correspondenceAddressSource}' for LAA reference ${application.laaReference}`,
    req,
  );

  return {
    clientCorrespondenceAddressDisplay: application.client.correspondenceAddress
      ? addressToHtml(application.client.correspondenceAddress)
      : "Not provided",
    careOfRecipientDisplay,
  };
}

function addressToHtml(address: {
  addressLine1: string;
  addressLine2?: string | null;
  townOrCity: string;
  county?: string | null;
  postcode: string;
}): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postcode,
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .map(escapeHtml)
    .join("<br>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapProceedings(proceedings: Proceeding[]): Array<
  Omit<Proceeding, "substantiveCostLimitation"> & {
    substantiveCostLimitation: string;
  }
> {
  return proceedings.map((p) => ({
    ...p,
    certificateType:
      CERTIFICATE_TYPES.find((t) => t.certificateTypeId === p.certificateType)
        ?.certificateTypeDescription ?? p.certificateType,
    clientInvolvementType:
      CLIENT_ROLES.find((t) => t.clientRoleId === p.clientInvolvementType)
        ?.clientRoleDescription ?? p.clientInvolvementType,
    levelOfService:
      LEVEL_OF_SERVICE.find((t) => t.levelOfServiceId === p.levelOfService)
        ?.levelOfServiceDescription ?? p.levelOfService,
    scopeLimitationHeading:
      SCOPE_OF_LIMITATION.find(
        (t) => t.scopeOfLimitationId === p.scopeLimitationHeading,
      )?.lscopeOfLimitationDescription ?? p.scopeLimitationHeading,
    substantiveCostLimitation: formatCurrency(p.substantiveCostLimitation),
  }));
}
