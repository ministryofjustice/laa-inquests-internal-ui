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
import { ApplicationDecisionNavigationHelper } from "./ApplicationDecisionNavigation.helper.js";
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
import { GrantDecisionUseCase } from "#src/use-cases/applications/decision/GrantDecision.useCase.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface DecisionUseCases {
  prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  processJustificationUseCase: ProcessJustificationUseCase;
  processCertificateStartDateUseCase: ProcessCertificateStartDateUseCase;
  prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  refuseDecisionUseCase: RefuseDecisionUseCase;
  grantDecisionUseCase: GrantDecisionUseCase;
}

export class ApplicationDecisionAdaptor {
  private readonly prepareDecisionFormUseCase: PrepareDecisionFormUseCase;
  private readonly processDecisionSelectionUseCase: ProcessDecisionSelectionUseCase;
  private readonly processJustificationUseCase: ProcessJustificationUseCase;
  private readonly processCertificateStartDateUseCase: ProcessCertificateStartDateUseCase;
  private readonly prepareConfirmationViewUseCase: PrepareConfirmationViewUseCase;
  private readonly refuseDecisionUseCase: RefuseDecisionUseCase;
  private readonly grantDecisionUseCase: GrantDecisionUseCase;
  private readonly navigationHelper: ApplicationDecisionNavigationHelper;

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
    this.grantDecisionUseCase =
      useCases.grantDecisionUseCase ?? new GrantDecisionUseCase();
    this.navigationHelper = new ApplicationDecisionNavigationHelper(
      this.sessionHelper,
    );
  }

  async renderApplicationDecisionForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<ApplicationDecisionFormErrors>,
  ): Promise<void> {
    const applicationId = req.params.applicationId as string;

    this.navigationHelper.prepareDecisionFormEntry(req, applicationId);

    const backUrl = this.navigationHelper.resolveDecisionBackUrl(
      req,
      applicationId,
    );

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
    this.navigationHelper.storeApplicationContext(req, applicationId);

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

    const redirectPath = this.navigationHelper.resolvePostDecisionSelectionPath(
      req as unknown as Request,
      applicationId,
      decisionToPersist,
    );

    res.redirect(redirectPath);
  }

  renderJustificationForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<JustificationFormErrors>,
  ): void {
    const applicationId = req.params.applicationId as string;
    this.navigationHelper.prepareDecisionFormEntry(req, applicationId);

    const backUrl = this.navigationHelper.resolveSecondaryDecisionBackUrl(
      req,
      applicationId,
      `/applications/${applicationId}/decision`,
    );
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

    this.navigationHelper.clearReturnToCheckYourAnswersFlagIfSet(
      req as unknown as Request,
    );

    res.redirect(`/applications/${applicationId}/decision/confirmation`);
  }

  renderCertificateStartDateForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<CertificateStartDateFormErrors>,
  ): void {
    const applicationId = req.params.applicationId as string;
    this.navigationHelper.prepareDecisionFormEntry(req, applicationId);

    const backUrl = this.navigationHelper.resolveSecondaryDecisionBackUrl(
      req,
      applicationId,
      `/applications/${applicationId}/decision`,
    );
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    res.render("application/decision/certificate-start-date/index", {
      backUrl,
      applicationId,
      startDateOption: sessionData?.certificateStartDateOption,
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
        "start-date-option": option,
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
        option,
        day,
        month,
        year,
        validate: (form) => this.validator.validateCertificateStartDate(form),
        existingSessionData,
      });

    if (processCertificateStartDateResult.status === "TECHNICAL_FAILURE") {
      throw new Error(
        processCertificateStartDateResult.message ??
          "Unable to process certificate start date",
      );
    }

    if (processCertificateStartDateResult.data) {
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

    this.navigationHelper.clearReturnToCheckYourAnswersFlagIfSet(
      req as unknown as Request,
    );

    res.redirect(`/applications/${applicationId}/decision/confirmation`);
  }

  renderConfirmationPage(req: Request, res: Response): void {
    const applicationId = req.params.applicationId as string;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;
    const backUrl =
      sessionData?.overallDecision === GRANTED_DECISION
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
    });
  }

  async processConfirmationForm(req: Request, res: Response): Promise<void> {
    const applicationId = req.params.applicationId as string;
    const sessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (sessionData?.overallDecision === GRANTED_DECISION) {
      const grantDecisionResult = await this.#processGrantDecision(
        req,
        res,
        applicationId,
        sessionData,
      );
      if (grantDecisionResult.status === "TECHNICAL_FAILURE") {
        throw new Error("Unable to submit grant decision");
      }
    } else {
      const refuseDecisionResult = await this.#processRefuseDecision(
        req,
        res,
        applicationId,
        sessionData,
      );
      if (refuseDecisionResult.status === "TECHNICAL_FAILURE") {
        throw new Error(
          refuseDecisionResult.message ?? "Unable to submit refusal decision",
        );
      }
    }

    res.redirect(`/applications/${applicationId}/decision/success`);
  }

  async #processGrantDecision(
    req: Request,
    res: Response,
    applicationId: string,
    sessionData: DecisionSessionData | null,
  ): Promise<UseCaseResult<void>> {
    const {
      certificateStartDateDay,
      certificateStartDateMonth,
      certificateStartDateYear,
    } = sessionData ?? {};
    if (
      !certificateStartDateDay ||
      !certificateStartDateMonth ||
      !certificateStartDateYear
    ) {
      throw new Error("Missing certificate start date in session data");
    }
    const paddedDay = certificateStartDateDay.padStart(2, "0");
    const paddedMonth = certificateStartDateMonth.padStart(2, "0");
    const certificateStartDate = `${certificateStartDateYear}-${paddedMonth}-${paddedDay}`;
    return await this.grantDecisionUseCase.execute({
      applicationId,
      certificateStartDate,
      applicationPort: this.viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });
  }

  async #processRefuseDecision(
    req: Request,
    res: Response,
    applicationId: string,
    sessionData: DecisionSessionData | null,
  ): Promise<UseCaseResult<void>> {
    const { refusalReason, justification } = sessionData ?? {};
    if (!refusalReason || !justification) {
      throw new Error(
        "Missing refusal reason or justification in session data",
      );
    }
    return await this.refuseDecisionUseCase.execute({
      applicationId,
      refusalReason,
      justification,
      applicationPort: this.viewApplicationAdaptor,
      accessToken: req.session.user?.accessToken,
    });
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
