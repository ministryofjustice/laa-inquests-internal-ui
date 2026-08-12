import type { Request, Response } from "express";
import type {
  Application,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { BuildApplicationClaimsViewUseCase } from "#src/use-cases/applications/claims/BuildApplicationClaimsView.useCase.js";
import { BuildApplicationHistoryViewUseCase } from "#src/use-cases/applications/history/BuildApplicationHistoryView.useCase.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { formatDate } from "#src/utils/dateFormatter.js";
import { getClaimCost } from "#src/utils/claimCost.js";
import {
  APPLICATION_TYPES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
} from "#src/infrastructure/locales/constants.js";
import { formatHistoryRows } from "#src/adaptors/presenter/applications/History.formatter.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  mapCertificateTypeForDisplay,
  mapClientInvolvementTypeForDisplay,
  mapLevelOfServiceForDisplay,
  getHomeAddressDisplay,
  getCorrespondenceDisplay,
  mapScopeLimitationHeadingForDisplay,
} from "#src/adaptors/presenter/applications/Application.formatter.js";

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

  private readonly buildApplicationHistoryViewUseCase: BuildApplicationHistoryViewUseCase;

  constructor(
    viewApplicationAdaptor: ApplicationPort,
    buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase = new BuildApplicationOverviewViewUseCase(),
    claimsAdaptor?: ClaimsPort,
    buildApplicationClaimsViewUseCase: BuildApplicationClaimsViewUseCase = new BuildApplicationClaimsViewUseCase(),
    buildApplicationHistoryViewUseCase: BuildApplicationHistoryViewUseCase = new BuildApplicationHistoryViewUseCase(),
  ) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
    this.claimsAdaptor = claimsAdaptor;
    this.buildApplicationOverviewViewUseCase =
      buildApplicationOverviewViewUseCase;
    this.buildApplicationClaimsViewUseCase = buildApplicationClaimsViewUseCase;
    this.buildApplicationHistoryViewUseCase =
      buildApplicationHistoryViewUseCase;
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

    const { historyRows, hasHistory, historyError } =
      await this.#buildHistoryView(req, applicationId);

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
      historyError,
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

  async #buildHistoryView(
    req: Request,
    applicationId: string,
  ): Promise<{
    historyRows: Array<Array<{ text?: string; html?: string }>>;
    hasHistory: boolean;
    historyError: boolean;
  }> {
    const { viewApplicationAdaptor, buildApplicationHistoryViewUseCase } = this;

    const historyViewResult = await buildApplicationHistoryViewUseCase.execute({
      applicationId,
      applicationPort: viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });

    if (historyViewResult.status !== "SUCCESS") {
      logger.logError(
        "GET Application history",
        `Failed to build history view for application ${applicationId}`,
        historyViewResult.status === "TECHNICAL_FAILURE"
          ? (historyViewResult.cause ?? historyViewResult.message)
          : undefined,
        req,
      );
      return { historyRows: [], hasHistory: false, historyError: true };
    }

    const { historyRows, hasHistory } = formatHistoryRows(
      historyViewResult.data.history,
    );

    return { historyRows, hasHistory, historyError: false };
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
