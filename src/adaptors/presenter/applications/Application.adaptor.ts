import type { Request, Response } from "express";
import type {
  Application,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { formatDate } from "#src/utils/dateFormatter.js";
import {
  APPLICATION_TYPES,
  CATEGORIES_OF_LAW,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVELS_OF_SERVICE,
  SCOPE_OF_LIMITATIONS,
} from "#src/infrastructure/locales/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const {
  pages: {
    applicationOverview: {
      people: {
        provider: { fallbackFirmName: PROVIDER_FIRM_NAME_UNAVAILABLE_MESSAGE },
      },
    },
  },
} = en;

export class ApplicationAdaptor {
  viewApplicationAdaptor: ApplicationPort;

  private readonly buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase;

  private readonly buildCertificateViewUseCase: BuildCertificateViewUseCase;

  constructor(
    viewApplicationAdaptor: ApplicationPort,
    buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase = new BuildApplicationOverviewViewUseCase(),
    buildCertificateViewUseCase: BuildCertificateViewUseCase = new BuildCertificateViewUseCase(
      viewApplicationAdaptor,
    ),
  ) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
    this.buildApplicationOverviewViewUseCase =
      buildApplicationOverviewViewUseCase;
    this.buildCertificateViewUseCase = buildCertificateViewUseCase;
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
        accessToken: req.session.user?.accessToken,
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
      backUrl: "/",
    });
  }

  async serveCoronersLetterDocument(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    const { viewApplicationAdaptor } = this;

    logger.logInfo(
      "GET Coroner's Letter Document",
      `Coroner's letter for application ${applicationId} requested.`,
      req,
    );

    try {
      const { data, contentType } =
        await viewApplicationAdaptor.getCoronersLetterDocument(
          applicationId,
          req.session.user?.accessToken,
        );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", "inline");
      res.send(data);
    } catch (error) {
      logger.logError(
        "GET Coroner's Letter Document",
        `Failed to retrieve coroner's letter for application ${applicationId}`,
        error,
        req,
      );

      res.status(500).render("application/error", {
        status: "Unable to retrieve document",
        error: "Unable to retrieve document. Please try again later",
      });
    }
  }

  async renderCertificatePage(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    logger.logInfo(
      "GET Certificate Page",
      `Certificate details for application ${applicationId} requested.`,
      req,
    );

    const certificateViewResult =
      await this.buildCertificateViewUseCase.execute({
        applicationId,
        accessToken: req.session.user?.accessToken,
      });

    // TODO: Handle 404s
    if (certificateViewResult.status !== "SUCCESS") {
      logger.logError(
        "GET Certificate Page",
        `Failed to build certificate view for application ${applicationId}`,
        certificateViewResult.status === "TECHNICAL_FAILURE"
          ? (certificateViewResult.cause ?? certificateViewResult.message)
          : undefined,
        req,
      );

      res.status(500).render("application/error", {
        status: "Unable to retrieve certificate",
        error: "Unable to retrieve certificate. Please try again later",
      });
      return;
    }
    const { data } = certificateViewResult;

    const certificateDetails = {
      ...data,
      effectiveDate: formatDate(data.effectiveDate),
      dateWorkCanCommence: formatDate(data.dateWorkCanCommence),
      dateCurrentLevelOfServiceEffective: formatDate(
        data.dateCurrentLevelOfServiceEffective,
      ),
      costLimitation: formatCurrency(Number(data.costLimitation)),
      certificateType: mapCertificateTypeForDisplay(data.certificateType),
      categoryOfLaw: mapCategoryOfLawForDisplay(data.categoryOfLaw),
      levelOfService: mapLevelOfServiceForDisplay(data.levelOfService),
      scopeLimitationHeading: mapScopeLimitationHeadingForDisplay(
        data.scopeLimitationHeading,
      ),
    };

    res.render("application/certificate", {
      backUrl: `/applications/${applicationId}/overview`,
      certificateDetails,
    });
  }
}

function mapApplication(application: Application): Application {
  const applicationType =
    (APPLICATION_TYPES as Record<string, string>)[
      application.applicationType
    ] ?? application.applicationType;

  const provider = application.provider
    ? {
        ...application.provider,
        firmName: mapProviderFirmName(application.provider.firmName),
      }
    : null;

  return {
    ...application,
    applicationType,
    provider,
  };
}

function mapProviderFirmName(firmName: string | null): string {
  if (!firmName || firmName.trim().length === 0) {
    return PROVIDER_FIRM_NAME_UNAVAILABLE_MESSAGE;
  }

  return firmName;
}

function mapProceedings(proceedings: Proceeding[]): Array<
  Omit<Proceeding, "substantiveCostLimitation"> & {
    substantiveCostLimitation: string;
  }
> {
  return proceedings.map((proceeding) => ({
    ...proceeding,
    certificateType: mapCertificateTypeForDisplay(proceeding.certificateType),
    clientInvolvementType: mapClientInvolvementTypeForDisplay(
      proceeding.clientInvolvementType,
    ),
    levelOfService: mapLevelOfServiceForDisplay(proceeding.levelOfService),
    scopeLimitationHeading: mapScopeLimitationHeadingForDisplay(
      proceeding.scopeLimitationHeading,
    ),
    substantiveCostLimitation: formatCurrency(
      proceeding.substantiveCostLimitation,
    ),
  }));
}

function mapCertificateTypeForDisplay(certificateType: string): string {
  return (
    (CERTIFICATE_TYPES as Record<string, string>)[certificateType] ??
    certificateType
  );
}

function mapClientInvolvementTypeForDisplay(
  clientInvolvementType: string,
): string {
  return (
    (CLIENT_ROLES as Record<string, string>)[clientInvolvementType] ??
    clientInvolvementType
  );
}

function mapLevelOfServiceForDisplay(levelOfService: string): string {
  return (
    (LEVELS_OF_SERVICE as Record<string, string>)[levelOfService] ??
    levelOfService
  );
}

function mapScopeLimitationHeadingForDisplay(
  scopeLimitationHeading: string,
): string {
  return (
    (SCOPE_OF_LIMITATIONS as Record<string, string>)[scopeLimitationHeading] ??
    scopeLimitationHeading
  );
}

function mapCategoryOfLawForDisplay(categoryOfLaw: string): string {
  return (
    (CATEGORIES_OF_LAW as Record<string, string>)[categoryOfLaw] ??
    categoryOfLaw
  );
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
