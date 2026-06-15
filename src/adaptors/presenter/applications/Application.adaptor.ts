import type { Request, Response } from "express";
import type {
  Application,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { formatCurrency } from "#src/utils/formatter.js";
import {
  APPLICATION_TYPES,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVEL_OF_SERVICE,
  SCOPE_OF_LIMITATION,
} from "#src/infrastructure/locales/constants.js";

export class ApplicationAdaptor {
  viewApplicationAdaptor: ApplicationPort;

  private readonly buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase;

  constructor(
    viewApplicationAdaptor: ApplicationPort,
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

    const overviewViewResult =
      await buildApplicationOverviewViewUseCase.execute({
        applicationId,
        applicationPort: viewApplicationAdaptor,
      });

    if (overviewViewResult.status !== "SUCCESS") {
      throw new Error("Unable to build application overview view");
    }

    const application = mapApplication(overviewViewResult.data.application);
    const proceedings = mapProceedings(application.proceedings);
    const clientHomeAddressDisplay = getHomeAddressDisplay(application);
    const { clientCorrespondenceAddressDisplay, careOfRecipientDisplay } =
      getCorrespondenceDisplay(application, clientHomeAddressDisplay);

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

function mapApplication(application: Application): Application {
  const applicationType =
    APPLICATION_TYPES.find(
      (t) => t.applicationTypeId === application.applicationType,
    )?.applicationTypeDescription ?? application.applicationType;

  return {
    ...application,
    applicationType,
  };
}

function mapProceedings(proceedings: Proceeding[]): Array<
  Omit<Proceeding, "substantiveCostLimitation"> & {
    substantiveCostLimitation: string;
  }
> {
  return proceedings.map((proceeding) => ({
    ...proceeding,
    certificateType:
      CERTIFICATE_TYPES.find(
        (type) => type.certificateTypeId === proceeding.certificateType,
      )?.certificateTypeDescription ?? proceeding.certificateType,
    clientInvolvementType:
      CLIENT_ROLES.find(
        (role) => role.clientRoleId === proceeding.clientInvolvementType,
      )?.clientRoleDescription ?? proceeding.clientInvolvementType,
    levelOfService:
      LEVEL_OF_SERVICE.find(
        (service) => service.levelOfServiceId === proceeding.levelOfService,
      )?.levelOfServiceDescription ?? proceeding.levelOfService,
    scopeLimitationHeading:
      SCOPE_OF_LIMITATION.find(
        (scope) =>
          scope.scopeOfLimitationId === proceeding.scopeLimitationHeading,
      )?.lscopeOfLimitationDescription ?? proceeding.scopeLimitationHeading,
    substantiveCostLimitation: formatCurrency(
      proceeding.substantiveCostLimitation,
    ),
  }));
}

function getHomeAddressDisplay(application: Application): string {
  if (application.client.hasNoFixedAbode === true) {
    return "No fixed abode";
  }

  if (!application.client.homeAddress) {
    return "Not provided";
  }

  return addressToHtml(application.client.homeAddress);
}

function getCorrespondenceDisplay(
  application: Application,
  clientHomeAddressDisplay: string,
): {
  clientCorrespondenceAddressDisplay: string;
  careOfRecipientDisplay?: string;
} {
  const careOfRecipientDisplay = application.correspondenceRecipient
    ? [
        application.correspondenceRecipient.recipientType,
        application.correspondenceRecipient.recipientName,
      ]
        .filter((line) => typeof line === "string" && line.trim().length > 0)
        .map(escapeHtml)
        .join("<br>")
    : undefined;

  if (
    application.client.correspondenceAddressSource === "USE_CLIENT_HOME_ADDRESS"
  ) {
    return {
      clientCorrespondenceAddressDisplay: clientHomeAddressDisplay,
      careOfRecipientDisplay,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_PROVIDER_ADDRESS"
  ) {
    return {
      clientCorrespondenceAddressDisplay: "Provider office address",
      careOfRecipientDisplay,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_SPECIFIED_ADDRESS"
  ) {
    if (!application.client.correspondenceAddress) {
      logger.logInfo(
        "Application overview address mapping",
        `Expected specified correspondence address was missing for LAA reference ${application.laaReference}`,
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
    "Application overview address mapping",
    `Unknown correspondenceAddressSource '${application.client.correspondenceAddressSource}' for LAA reference ${application.laaReference}`,
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
