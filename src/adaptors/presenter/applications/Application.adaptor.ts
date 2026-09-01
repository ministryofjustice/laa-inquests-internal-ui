import type { Request, Response } from "express";
import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { BuildApplicationClaimsViewUseCase } from "#src/use-cases/applications/claims/BuildApplicationClaimsView.useCase.js";
import { BuildApplicationHistoryViewUseCase } from "#src/use-cases/applications/history/BuildApplicationHistoryView.useCase.js";
import { AddHistoryNoteUseCase } from "#src/use-cases/applications/history/AddHistoryNote.useCase.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { formatDate } from "#src/utils/dateFormatter.js";
import { getClaimCost, mapClaimType } from "#src/utils/claim.js";
import { CLAIM_STATUSES } from "#src/infrastructure/locales/constants.js";
import { formatHistoryRows } from "#src/adaptors/presenter/applications/History.formatter.js";
import {
  getHomeAddressDisplay,
  getCorrespondenceDisplay,
  mapApplication,
  mapProceeding,
} from "#src/adaptors/presenter/applications/Application.formatter.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { AddHistoryNoteValidator } from "#src/adaptors/presenter/applications/AddHistoryNote.validator.js";
import type { AddHistoryNoteForm } from "#src/adaptors/presenter/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const {
  pages: {
    applicationOverview: {
      history: {
        validationErrors: { saveFailed: SAVE_FAILED_ERROR },
      },
    },
  },
} = en;

interface NoteState {
  errorSummaries?: Array<{ text: string; href: string }>;
  noteText?: string;
  excessCount?: number;
  noteSuccessBanner?: boolean;
}

export class ApplicationAdaptor {
  viewApplicationAdaptor: ApplicationPort;

  private readonly claimsAdaptor?: ClaimsPort;

  private readonly sessionHelper?: SessionHelper;

  private readonly buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase;

  private readonly buildApplicationClaimsViewUseCase: BuildApplicationClaimsViewUseCase;

  private readonly buildApplicationHistoryViewUseCase: BuildApplicationHistoryViewUseCase;

  private readonly addHistoryNoteUseCase: AddHistoryNoteUseCase;

  private readonly addHistoryNoteValidator: AddHistoryNoteValidator;

  constructor(
    viewApplicationAdaptor: ApplicationPort,
    sessionHelper?: SessionHelper,
    buildApplicationOverviewViewUseCase: BuildApplicationOverviewViewUseCase = new BuildApplicationOverviewViewUseCase(),
    claimsAdaptor?: ClaimsPort,
    buildApplicationClaimsViewUseCase: BuildApplicationClaimsViewUseCase = new BuildApplicationClaimsViewUseCase(),
    buildApplicationHistoryViewUseCase: BuildApplicationHistoryViewUseCase = new BuildApplicationHistoryViewUseCase(),
    addHistoryNoteUseCase: AddHistoryNoteUseCase = new AddHistoryNoteUseCase(),
    addHistoryNoteValidator: AddHistoryNoteValidator = new AddHistoryNoteValidator(),
  ) {
    this.viewApplicationAdaptor = viewApplicationAdaptor;
    this.sessionHelper = sessionHelper;
    this.claimsAdaptor = claimsAdaptor;
    this.buildApplicationOverviewViewUseCase =
      buildApplicationOverviewViewUseCase;
    this.buildApplicationClaimsViewUseCase = buildApplicationClaimsViewUseCase;
    this.buildApplicationHistoryViewUseCase =
      buildApplicationHistoryViewUseCase;
    this.addHistoryNoteUseCase = addHistoryNoteUseCase;
    this.addHistoryNoteValidator = addHistoryNoteValidator;
  }

  async renderApplicationPage(
    req: Request,
    res: Response,
    applicationId: string,
    noteState: NoteState = {},
  ): Promise<void> {
    const { viewApplicationAdaptor, buildApplicationOverviewViewUseCase } =
      this;

    logger.logInfo({
      functionName: "render_application_page",
      message: "Application overview requested",
      request: req,
      extraContext: {
        event: "application_overview_requested",
        laa_reference: applicationId,
      },
    });

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

    const { historyRows, historyError } = await this.#buildHistoryView(
      req,
      applicationId,
    );

    const flashMessage = this.sessionHelper?.consumeFlash(
      req,
      "publicAuthority",
    );

    const noteFlash = this.sessionHelper?.consumeFlash(req, "history");

    res.render("application/application-overview", {
      application,
      proceeding,
      clientHomeAddressDisplay,
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      statusTag,
      claims,
      historyRows,
      historyError,
      backUrl: "/",
      ...(flashMessage && { successFlash: flashMessage }),
      ...(noteFlash === "note-added" && { noteSuccessBanner: true }),
      ...noteState,
    });
  }

  async #buildClaimsView(
    req: Request,
    applicationId: string,
    substantiveCertificate: number,
  ): Promise<ClaimsViewModel> {
    const { claimsAdaptor, buildApplicationClaimsViewUseCase } = this;

    if (!claimsAdaptor) {
      logger.logError({
        functionName: "build_claims_view",
        message: "No claims adaptor configured",
        request: req,
        extraContext: {
          event: "claims_adaptor_missing",
          laa_reference: applicationId,
        },
      });
      return { unavailable: true };
    }

    const claimsViewResult = await buildApplicationClaimsViewUseCase.execute({
      applicationId,
      claimsPort: claimsAdaptor,
      substantiveCertificate,
      accessToken: req.session.user?.accessToken,
    });

    if (claimsViewResult.status !== "SUCCESS") {
      logger.logError({
        functionName: "build_claims_view",
        message: "Failed to build claims view",
        err:
          claimsViewResult.status === "TECHNICAL_FAILURE"
            ? (claimsViewResult.cause ?? claimsViewResult.message)
            : undefined,
        request: req,
        extraContext: {
          event: "claims_view_build_failed",
          laa_reference: applicationId,
          result_status: claimsViewResult.status,
        },
      });
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
    historyError: boolean;
  }> {
    const { viewApplicationAdaptor, buildApplicationHistoryViewUseCase } = this;

    const historyViewResult = await buildApplicationHistoryViewUseCase.execute({
      applicationId,
      applicationPort: viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });

    if (historyViewResult.status !== "SUCCESS") {
      logger.logError({
        functionName: "build_history_view",
        message: "Failed to build history view",
        err:
          historyViewResult.status === "TECHNICAL_FAILURE"
            ? (historyViewResult.cause ?? historyViewResult.message)
            : undefined,
        request: req,
        extraContext: {
          event: "history_view_build_failed",
          laa_reference: applicationId,
          result_status: historyViewResult.status,
        },
      });
      return { historyRows: [], historyError: true };
    }

    const historyRows = formatHistoryRows(historyViewResult.data.history);

    return { historyRows, historyError: false };
  }

  async serveCoronersLetterDocument(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    const { viewApplicationAdaptor } = this;

    logger.logInfo({
      functionName: "serve_coroners_letter_document",
      message: "Coroner letter requested",
      request: req,
      extraContext: {
        event: "coroners_letter_requested",
        laa_reference: applicationId,
      },
    });

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
      logger.logError({
        functionName: "serve_coroners_letter_document",
        message: "Failed to retrieve coroner letter",
        err: error,
        request: req,
        extraContext: {
          event: "coroners_letter_retrieval_failed",
          laa_reference: applicationId,
        },
      });

      res.status(500).render("application/error", {
        status: "Unable to retrieve document",
        error: "Unable to retrieve document. Please try again later",
      });
    }
  }

  async submitHistoryNote(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    const form = req.body as AddHistoryNoteForm;

    logger.logInfo({
      functionName: "submit_history_note",
      message: "History note submission requested",
      request: req,
      extraContext: {
        event: "history_note_submission_requested",
        laa_reference: applicationId,
      },
    });

    const validationResult =
      this.addHistoryNoteValidator.validateAddHistoryNoteForm(form);

    if (Object.keys(validationResult.errors).length > 0) {
      const errorSummaries = Object.values(validationResult.errors).map(
        (error) => ({
          text: error.text,
          href: "#note-text",
        }),
      );

      await this.renderApplicationPage(req, res, applicationId, {
        errorSummaries,
        noteText: form["note-text"],
        excessCount: validationResult.excessCount,
      });
      return;
    }

    const { "note-text": noteText } = form;

    const result = await this.addHistoryNoteUseCase.execute({
      applicationId,
      noteText,
      applicationPort: this.viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });

    if (result.status !== "SUCCESS") {
      await this.renderApplicationPage(req, res, applicationId, {
        errorSummaries: [
          {
            text: SAVE_FAILED_ERROR,
            href: "#note-text",
          },
        ],
        noteText,
      });
      return;
    }

    this.sessionHelper?.setFlash(req, "history", "note-added");
    res.redirect(`/applications/${applicationId}/overview`);
  }
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

function mapClaimStatus(status: string | null | undefined): string {
  if (!status) {
    return "";
  }

  return (CLAIM_STATUSES as Record<string, string>)[status] ?? status;
}
