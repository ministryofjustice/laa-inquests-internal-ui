import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type {
  TypedRequest,
  IdParams,
} from "#src/infrastructure/express/api.types.js";
import type {
  ApplicationDecisionForm,
  ApplicationDecisionFormErrors,
  JustificationForm,
  JustificationFormErrors,
  CertificateStartDateForm,
  CertificateStartDateFormErrors,
} from "./models/form.types.js";
import type { ApplicationDecisionValidator } from "./ApplicationDecision.validator.js";
import {
  type DecisionSessionData,
  PrepareDecisionFormUseCase,
} from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { ProcessDecisionSelectionUseCase } from "#src/use-cases/applications/decision/ProcessDecisionSelection.useCase.js";
import { ProcessJustificationUseCase } from "#src/use-cases/applications/decision/ProcessJustification.useCase.js";
import { ProcessCertificateStartDateUseCase } from "#src/use-cases/applications/decision/ProcessCertificateStartDate.useCase.js";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";
import { RefuseDecisionUseCase } from "#src/use-cases/applications/decision/RefuseDecision.useCase.js";
import { GRANTED_DECISION } from "#src/infrastructure/locales/constants.js";

interface DecisionUseCases {
  prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  processJustificationUseCase: ProcessJustificationUseCase;
  processCertificateStartDateUseCase: ProcessCertificateStartDateUseCase;
  prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  refuseDecisionUseCase: RefuseDecisionUseCase;
}

export class ApplicationDecisionAdaptor {
  private readonly prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  private readonly processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  private readonly processJustificationUseCase: ProcessJustificationUseCase;
  private readonly processCertificateStartDateUseCase: ProcessCertificateStartDateUseCase;
  private readonly prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  private readonly refuseDecisionUseCase: RefuseDecisionUseCase;

  constructor(
    private readonly viewApplicationAdaptor: ApplicationPort,
    private readonly sessionHelper: SessionHelper,
    private readonly validator: ApplicationDecisionValidator,
    useCases: Partial<DecisionUseCases> = {},
  ) {
    this.prepareDecisionFormUseCase =
      useCases.prepareDecisionFormUseCase ?? new PrepareDecisionFormUseCase();
    this.processDecisionSelectionUseCase =
      useCases.processDecisionSelectionUseCase ??
      new ProcessDecisionSelectionUseCase();
    this.processJustificationUseCase =
      useCases.processJustificationUseCase ?? new ProcessJustificationUseCase();
    this.processCertificateStartDateUseCase =
      useCases.processCertificateStartDateUseCase ??
      new ProcessCertificateStartDateUseCase();
    this.prepareConfirmationViewUseCase =
      useCases.prepareConfirmationViewUseCase ??
      new PrepareConfirmationViewUseCase();
    this.refuseDecisionUseCase =
      useCases.refuseDecisionUseCase ?? new RefuseDecisionUseCase();
  }

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<ApplicationDecisionFormErrors>,
  ): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/overview`;

    const data = await this.viewApplicationAdaptor.getApplication(
      applicationId,
      req.session.user?.accessToken,
    );
    const sessionDecision = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    const prepareDecisionFormResult = this.prepareDecisionFormUseCase.execute({
      application: data,
      sessionDecision,
    });

    if (prepareDecisionFormResult.status === "TECHNICAL_FAILURE") {
      throw new Error(prepareDecisionFormResult.message);
    }

    if (prepareDecisionFormResult.status !== "SUCCESS") {
      throw new Error("Unable to prepare decision form");
    }

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- false positive on already-destructured payload
    const { proceeding, selectedOverallDecision } =
      prepareDecisionFormResult.data;

    this.sessionHelper.storeSessionData(req, "decision", proceeding);

    res.render("application/decision/index", {
      backUrl,
      applicationId,
      proceeding,
      overallDecision: selectedOverallDecision,
      ...(errorSummaries && { errorSummaries }),
    });
  }

  async processApplicationDecisionForm(
    req: TypedRequest<ApplicationDecisionForm, IdParams>,
    res: Response,
  ): Promise<void> {
    const {
      body: { "overall-decision": overallDecision },
      params: { applicationId },
    } = req;

    const processDecisionSelectionResult =
      this.processDecisionSelectionUseCase.execute({
        overallDecision,
        validate: (form) =>
          this.validator.validateApplicationDecisionForm(form),
      });

    const decisionToPersist =
      processDecisionSelectionResult.status === "TECHNICAL_FAILURE"
        ? overallDecision
        : (processDecisionSelectionResult.data?.overallDecision ??
          overallDecision);

    this.sessionHelper.storeSessionData(req, "decision", {
      overallDecision: decisionToPersist,
    });

    if (processDecisionSelectionResult.status === "VALIDATION_FAILED") {
      await this.renderApplicationDecisionForm(
        req as unknown as Request,
        res,
        processDecisionSelectionResult.validationErrors,
      );
      return;
    }

    if (decisionToPersist === GRANTED_DECISION) {
      res.redirect(
        `/applications/${applicationId}/decision/certificate-start-date`,
      );
      return;
    }

    res.redirect(`/applications/${applicationId}/decision/justification`);
  }

  renderJustificationForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<JustificationFormErrors>,
  ): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision`;
    const sessionData = this.sessionHelper.getSessionData(req, "decision");
    res.render("application/decision/justification/index", {
      backUrl,
      laaReference: applicationId,
      refusalReason: sessionData?.refusalReason,
      justification: sessionData?.justification,
      ...(errorSummaries && { errorSummaries }),
    });
  }

  processJustificationForm(
    req: TypedRequest<JustificationForm, IdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId },
    } = req;
    const {
      body: { "refusal-reason": refusalReason, justification },
    } = req;

    const existingSessionData = this.sessionHelper.getSessionData(
      req as unknown as Request,
      "decision",
    ) as DecisionSessionData | null;
    const processJustificationResult = this.processJustificationUseCase.execute(
      {
        refusalReason,
        justification,
        validate: (form) => this.validator.validateJustification(form),
        existingSessionData,
      },
    );

    if (
      processJustificationResult.status !== "TECHNICAL_FAILURE" &&
      processJustificationResult.data
    ) {
      this.sessionHelper.storeSessionData(req, "decision", {
        ...processJustificationResult.data,
      });
    }

    if (processJustificationResult.status === "VALIDATION_FAILED") {
      this.renderJustificationForm(
        req as unknown as Request,
        res,
        processJustificationResult.validationErrors,
      );
      return;
    }

    res.redirect(`/applications/${applicationId}/decision/confirmation`);
  }

  renderCertificateStartDateForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<CertificateStartDateFormErrors>,
  ): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision`;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    res.render("application/decision/certificate-start-date/index", {
      backUrl,
      applicationId,
      day: sessionData?.certificateStartDateDay,
      month: sessionData?.certificateStartDateMonth,
      year: sessionData?.certificateStartDateYear,
      ...(errorSummaries && { errorSummaries }),
    });
  }

  processCertificateStartDateForm(
    req: TypedRequest<CertificateStartDateForm, IdParams>,
    res: Response,
  ): void {
    const {
      params: { applicationId },
    } = req;
    const {
      body: {
        "start-date-day": day,
        "start-date-month": month,
        "start-date-year": year,
      },
    } = req;

    const existingSessionData = this.sessionHelper.getSessionData(
      req as unknown as Request,
      "decision",
    ) as DecisionSessionData | null;
    const processCertificateStartDateResult =
      this.processCertificateStartDateUseCase.execute({
        day,
        month,
        year,
        validate: (form) => this.validator.validateCertificateStartDate(form),
        existingSessionData,
      });

    if (
      processCertificateStartDateResult.status !== "TECHNICAL_FAILURE" &&
      processCertificateStartDateResult.data
    ) {
      this.sessionHelper.storeSessionData(req, "decision", {
        ...processCertificateStartDateResult.data,
      });
    }

    if (processCertificateStartDateResult.status === "VALIDATION_FAILED") {
      this.renderCertificateStartDateForm(
        req as unknown as Request,
        res,
        processCertificateStartDateResult.validationErrors,
      );
      return;
    }

    res.redirect(`/applications/${applicationId}/decision/confirmation`);
  }

  renderConfirmationPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    const isGranted = sessionData?.overallDecision === GRANTED_DECISION;
    const backUrl = isGranted
      ? `/applications/${applicationId}/decision/certificate-start-date`
      : `/applications/${applicationId}/decision/justification`;
    const prepareConfirmationViewResult: ReturnType<
      PrepareConfirmationViewUseCase["execute"]
    > = this.prepareConfirmationViewUseCase.execute({
      decisionSessionData: sessionData,
    });

    if (prepareConfirmationViewResult.status !== "SUCCESS") {
      throw new Error("Unable to prepare confirmation view");
    }

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- false positive on already-destructured payload
    const {
      proceeding,
      overallDecision,
      refusalReasonLabel,
      justification,
      certificateStartDate,
    } = prepareConfirmationViewResult.data;

    res.render("application/decision/confirmation/index", {
      backUrl,
      applicationId,
      proceeding,
      overallDecision,
      refusalReasonLabel,
      justification,
      certificateStartDate,
      isGranted,
    });
  }

  async processConfirmationForm(req: Request, res: Response): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (sessionData?.overallDecision === GRANTED_DECISION) {
      res.redirect(`/applications/${applicationId}/decision/success`);
      return;
    }

    const { refusalReason, justification } = sessionData ?? {};
    if (!refusalReason || !justification) {
      throw new Error(
        "Missing refusal reason or justification in session data",
      );
    }

    const refuseDecisionResult = await this.refuseDecisionUseCase.execute({
      applicationId,
      refusalReason,
      justification,
      applicationPort: this.viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });

    if (refuseDecisionResult.status === "TECHNICAL_FAILURE") {
      throw new Error(
        refuseDecisionResult.message ?? "Unable to submit refusal decision",
      );
    }

    res.redirect(`/applications/${applicationId}/decision/success`);
  }

  renderDecisionSuccessPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision/confirmation`;
    this.sessionHelper.clearSessionData(req, "decision");
    res.render("application/decision/success/index", {
      applicationId,
      backUrl,
    });
  }
}
