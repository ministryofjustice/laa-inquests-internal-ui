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
} from "./models/form.types.js";
import type { ApplicationDecisionValidator } from "./ApplicationDecision.validator.js";
import {
  type DecisionSessionData,
  PrepareDecisionFormUseCase,
} from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { ProcessDecisionSelectionUseCase } from "#src/use-cases/applications/decision/ProcessDecisionSelection.useCase.js";
import { ProcessJustificationUseCase } from "#src/use-cases/applications/decision/ProcessJustification.useCase.js";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";
import { SubmitDecisionUseCase } from "#src/use-cases/applications/decision/SubmitDecision.useCase.js";

interface DecisionUseCases {
  prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  processJustificationUseCase: ProcessJustificationUseCase;
  prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  submitDecisionUseCase: SubmitDecisionUseCase;
}

export class ApplicationDecisionAdaptor {
  private readonly prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  private readonly processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  private readonly processJustificationUseCase: ProcessJustificationUseCase;
  private readonly prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  private readonly submitDecisionUseCase: SubmitDecisionUseCase;

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
    this.prepareConfirmationViewUseCase =
      useCases.prepareConfirmationViewUseCase ??
      new PrepareConfirmationViewUseCase();
    this.submitDecisionUseCase =
      useCases.submitDecisionUseCase ?? new SubmitDecisionUseCase();
  }

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<ApplicationDecisionFormErrors>,
  ): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/overview`;

    const data =
      await this.viewApplicationAdaptor.getApplication(applicationId);
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

  renderConfirmationPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const backUrl = `/applications/${applicationId}/decision/justification`;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    const prepareConfirmationViewResult: ReturnType<
      PrepareConfirmationViewUseCase["execute"]
    > = this.prepareConfirmationViewUseCase.execute({
      decisionSessionData: sessionData,
    });

    if (prepareConfirmationViewResult.status !== "SUCCESS") {
      throw new Error("Unable to prepare confirmation view");
    }

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- false positive on already-destructured payload
    const { proceeding, overallDecision, refusalReasonLabel, justification } =
      prepareConfirmationViewResult.data;

    res.render("application/decision/confirmation/index", {
      backUrl,
      applicationId,
      proceeding,
      overallDecision,
      refusalReasonLabel,
      justification,
    });
  }

  async processConfirmationForm(req: Request, res: Response): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    const submitDecisionResult = await this.submitDecisionUseCase.execute({
      applicationId,
      overallDecision: sessionData?.overallDecision,
      applicationPort: this.viewApplicationAdaptor,
    });

    if (submitDecisionResult.status === "TECHNICAL_FAILURE") {
      throw new Error(
        submitDecisionResult.message ?? "Unable to submit merits decision",
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
