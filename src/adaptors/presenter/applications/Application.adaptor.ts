import type { Request, Response } from "express";
import type {
  Application,
  HistoryEventList,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { BuildApplicationClaimsViewUseCase } from "#src/use-cases/applications/claims/BuildApplicationClaimsView.useCase.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { formatDate, formatDateTime } from "#src/utils/dateFormatter.js";
import { getClaimCost } from "#src/utils/claimCost.js";
import {
  escapeHtml,
  formatAddressToHtml,
} from "#src/utils/addressFormatter.js";
import {
  APPLICATION_TYPES,
  CATEGORIES_OF_LAW,
  CERTIFICATE_TYPES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  CLIENT_ROLES,
  LEVELS_OF_SERVICE,
  SCOPE_OF_LIMITATIONS,
} from "#src/infrastructure/locales/constants.js";
import { HISTORY_EVENT_FORMATTERS } from "#src/adaptors/presenter/applications/historyEventFormatters.js";
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

  private readonly claimsAdaptor?: ClaimsPort;

  private readonly buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase;

  private readonly buildApplicationClaimsViewUseCase: BuildApplicationClaimsViewUseCase;

  private readonly buildCertificateViewUseCase: BuildCertificateViewUseCase;

  constructor(
    viewApplicationAdaptor: ApplicationPort,
    buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase = new BuildApplicationOverviewViewUseCase(),
    buildCertificateViewUseCase: BuildCertificateViewUseCase = new BuildCertificateViewUseCase(
      viewApplicationAdaptor,
    ),
    claimsAdaptor?: ClaimsPort,
    buildApplicationClaimsViewUseCase: BuildApplicationClaimsViewUseCase = new BuildApplicationClaimsViewUseCase(),
  ) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
    this.claimsAdaptor = claimsAdaptor;
    this.buildApplicationOverviewViewUseCase =
      buildApplicationOverviewViewUseCase;
    this.buildApplicationClaimsViewUseCase = buildApplicationClaimsViewUseCase;
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
    const proceeding = mapProceeding(application.proceeding);
    const clientHomeAddressDisplay = getHomeAddressDisplay(application);
    const { clientCorrespondenceAddressDisplay, careOfRecipientDisplay } =
      getCorrespondenceDisplay(application, clientHomeAddressDisplay);

    const { historyRows, hasHistory } = formatHistoryRows(
      overviewViewResult.data.history,
    );

    const isPending =
      !application.overallDecision ||
      application.overallDecision.toUpperCase() === "PENDING";
    const statusTag = isPending
      ? { text: "Awaiting assessment", classes: "govuk-tag--grey" }
      : { text: "Assessment complete", classes: "govuk-tag--green" };

    const claims = await this.#buildClaimsView(
      req,
      applicationId,
      overviewViewResult.data.application.proceeding.substantiveCostLimitation,
    );

    res.render("application/application-overview", {
      application,
      proceeding,
      clientHomeAddressDisplay,
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      statusTag,
      claims,
      historyRows,
      hasHistory,
      backUrl: "/",
    });
  }

  async #buildClaimsView(
    req: Request,
    applicationId: string,
    substantiveCertificate: number,
  ): Promise<ClaimsViewModel> {
    const { claimsAdaptor, buildApplicationClaimsViewUseCase } = this;

    if (!claimsAdaptor) {
      logger.logError(
        "GET Application claims",
        `No claims adaptor configured for application ${applicationId}`,
        undefined,
        req,
      );
      return { unavailable: true };
    }

    const claimsViewResult = await buildApplicationClaimsViewUseCase.execute({
      applicationId,
      claimsPort: claimsAdaptor,
      substantiveCertificate,
      accessToken: req.session.user?.accessToken,
    });

    if (claimsViewResult.status !== "SUCCESS") {
      logger.logError(
        "GET Application claims",
        `Failed to build claims view for application ${applicationId}`,
        claimsViewResult.status === "TECHNICAL_FAILURE"
          ? (claimsViewResult.cause ?? claimsViewResult.message)
          : undefined,
        req,
      );
      return { unavailable: true };
    }

    const { data } = claimsViewResult;

    return {
      hasClaims: data.hasClaims,
      substantiveCertificate: formatCurrency(data.substantiveCertificate),
      totalRemaining: formatCurrency(data.totalRemaining),
      toBeAssessed: data.toBeAssessedClaims.map((claim) =>
        mapClaimRow(claim, applicationId),
      ),
      assessed: data.assessedClaims.map((claim) =>
        mapClaimRow(claim, applicationId),
      ),
    };
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

    if (certificateViewResult.status !== "SUCCESS") {
      logger.logError(
        "GET Certificate Page",
        `Failed to build certificate view for application ${applicationId}`,
        certificateViewResult.status === "TECHNICAL_FAILURE"
          ? (certificateViewResult.cause ?? certificateViewResult.message)
          : undefined,
        req,
      );

      if (
        certificateViewResult.status === "TECHNICAL_FAILURE" &&
        certificateViewResult.reason ===
          TECHNICAL_FAILURE_REASONS.RESOURCE_NOT_FOUND
      ) {
        res.status(404).render("application/error", {
          status: 404,
          error: "The certificate for this application could not be found.",
        });
        return;
      }

      res.status(500).render("application/error", {
        status: "Unable to retrieve certificate",
        error: "Unable to retrieve certificate. Please try again later",
      });
      return;
    }
    const { data } = certificateViewResult;

    const certificateDetails = {
      ...data,
      clientAddress: formatAddressToHtml(data.clientAddress),
      officeAddress: formatAddressToHtml(data.officeAddress),
      opponentDetails: (data.opponentDetails ?? [])
        .map(escapeHtml)
        .join("<br>"),
      dateCreated: formatDate(data.dateCreated),
      effectiveDate: formatDate(data.effectiveDate),
      dateWorkCanCommence: formatDate(data.dateWorkCanCommence),
      dateCurrentLevelOfServiceEffective: formatDate(
        data.dateCurrentLevelOfServiceEffective,
      ),
      costLimitation: formatCurrency(data.costLimitation),
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

function mapProceeding(proceeding: Proceeding): Omit<
  Proceeding,
  "substantiveCostLimitation"
> & {
  substantiveCostLimitation: string;
} {
  return {
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
  };
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

  return formatAddressToHtml(application.client.homeAddress);
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
      clientCorrespondenceAddressDisplay: formatAddressToHtml(
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
      ? formatAddressToHtml(application.client.correspondenceAddress)
      : "Not provided",
    careOfRecipientDisplay,
  };
}

interface ClaimRow {
  date: string;
  total: string;
  status: string;
  claimType: string;
  href: string;
}

interface ClaimsViewModel {
  unavailable?: boolean;
  hasClaims?: boolean;
  substantiveCertificate?: string;
  totalRemaining?: string;
  toBeAssessed?: ClaimRow[];
  assessed?: ClaimRow[];
}

function mapClaimRow(claim: ClaimSummary, applicationId: string): ClaimRow {
  return {
    date: formatDate(claim.submissionDate),
    total: formatCurrency(getClaimCost(claim)),
    status: mapClaimStatus(claim.statusId ?? claim.claimDecisionStatus),
    claimType: mapClaimType(claim.claimTypeId),
    href: `/applications/${applicationId}/claims/${claim.claimId}`,
  };
}

function mapClaimType(claimTypeId: string): string {
  return (CLAIM_TYPES as Record<string, string>)[claimTypeId] ?? claimTypeId;
}

function mapClaimStatus(status: string | null | undefined): string {
  if (!status) {
    return "";
  }

  return (CLAIM_STATUSES as Record<string, string>)[status] ?? status;
}
function formatHistoryEventUpdate(
  eventReference: string,
  eventData: Record<string, unknown> | null | undefined,
): string {
  // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Dynamic property access requires bracket notation
  const formatter = HISTORY_EVENT_FORMATTERS[eventReference];

  const historyEventHeading = formatter
    ? formatter(eventData)
    : escapeHtml(eventReference);

  return `<strong>${historyEventHeading}</strong>`;
}

function formatHistoryRows(history: HistoryEventList): {
  historyRows: Array<Array<{ text?: string; html?: string }>>;
  hasHistory: boolean;
} {
  if (history.length === 0) {
    return { historyRows: [], hasHistory: false };
  }

  const historyRows = history.map((event) => {
    const timestamp = formatDateTime(event.timestamp);
    const actor = escapeHtml(event.actor);
    const update = formatHistoryEventUpdate(
      event.eventReference,
      event.eventData,
    );

    return [{ text: timestamp }, { text: actor }, { html: update }];
  });

  return { historyRows, hasHistory: true };
}
