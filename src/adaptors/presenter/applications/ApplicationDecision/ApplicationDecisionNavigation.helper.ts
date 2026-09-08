import type { Request } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { GRANTED_DECISION } from "#src/infrastructure/locales/constants.js";

const CHECK_YOUR_ANSWERS_ORIGIN = "check-your-answers";
const RETURN_TO_CHECK_YOUR_ANSWERS_FLAG = "true";

export class ApplicationDecisionNavigationHelper {
  constructor(private readonly sessionHelper: SessionHelper) {}

  prepareDecisionFormEntry(req: Request, laaReference: string): void {
    this.#resetDecisionSessionForApplication(req, laaReference);
    this.#resetReturnToCheckYourAnswersFlagForFreshDecisionEntry(req);
    this.#captureCheckYourAnswersEntry(req);
  }

  storeApplicationContext(req: Request, laaReference: string): void {
    this.sessionHelper.storeSessionData(req, "decision", { laaReference });
  }

  resolveDecisionBackUrl(req: Request, laaReference: string): string {
    if (this.#shouldReturnToCheckYourAnswersFromRequest(req)) {
      return `/applications/${laaReference}/decision/confirmation`;
    }

    return `/applications/${laaReference}/overview`;
  }

  resolveSecondaryDecisionBackUrl(
    req: Request,
    laaReference: string,
    defaultPath: string,
  ): string {
    if (this.#shouldReturnToCheckYourAnswersFromRequest(req)) {
      return `/applications/${laaReference}/decision/confirmation`;
    }

    return defaultPath;
  }

  resolvePostDecisionSelectionPath(
    req: Request,
    laaReference: string,
    overallDecision: string,
  ): string {
    const decisionSessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (!this.#shouldReturnToCheckYourAnswers(decisionSessionData)) {
      if (overallDecision === GRANTED_DECISION) {
        return `/applications/${laaReference}/decision/certificate-start-date`;
      }

      return `/applications/${laaReference}/decision/justification`;
    }

    const updatedSessionData: DecisionSessionData = {
      ...(decisionSessionData ?? {}),
      overallDecision,
    };

    if (overallDecision === GRANTED_DECISION) {
      if (this.#hasCertificateStartDate(updatedSessionData)) {
        this.#clearReturnToCheckYourAnswersFlag(req);
        return `/applications/${laaReference}/decision/confirmation`;
      }

      return `/applications/${laaReference}/decision/certificate-start-date`;
    }

    if (this.#hasRefusalDetails(updatedSessionData)) {
      this.#clearReturnToCheckYourAnswersFlag(req);
      return `/applications/${laaReference}/decision/confirmation`;
    }

    return `/applications/${laaReference}/decision/justification`;
  }

  clearReturnToCheckYourAnswersFlagIfSet(req: Request): void {
    const decisionSessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (this.#shouldReturnToCheckYourAnswers(decisionSessionData)) {
      this.#clearReturnToCheckYourAnswersFlag(req);
    }
  }

  #captureCheckYourAnswersEntry(req: Request): void {
    if (this.#isCheckYourAnswersOrigin(req)) {
      this.sessionHelper.storeSessionData(req, "decision", {
        returnToCheckYourAnswers: RETURN_TO_CHECK_YOUR_ANSWERS_FLAG,
      });
    }
  }

  #clearReturnToCheckYourAnswersFlag(req: Request): void {
    this.sessionHelper.storeSessionData(req, "decision", {
      returnToCheckYourAnswers: "",
    });
  }

  #resetReturnToCheckYourAnswersFlagForFreshDecisionEntry(req: Request): void {
    if (req.method !== "GET") {
      return;
    }

    if (this.#isCheckYourAnswersOrigin(req)) {
      return;
    }

    const decisionSessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (this.#shouldReturnToCheckYourAnswers(decisionSessionData)) {
      this.#clearReturnToCheckYourAnswersFlag(req);
    }
  }

  #resetDecisionSessionForApplication(
    req: Request,
    laaReference: string,
  ): void {
    if (req.method !== "GET") {
      return;
    }

    const decisionSessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    if (!decisionSessionData) {
      return;
    }

    if (decisionSessionData.laaReference === laaReference) {
      return;
    }

    if (this.#isCheckYourAnswersOrigin(req)) {
      return;
    }

    this.sessionHelper.clearSessionData(req, "decision");
  }

  #shouldReturnToCheckYourAnswers(
    sessionData: DecisionSessionData | null,
  ): boolean {
    return (
      sessionData?.returnToCheckYourAnswers ===
      RETURN_TO_CHECK_YOUR_ANSWERS_FLAG
    );
  }

  #isCheckYourAnswersOrigin(req: Request): boolean {
    return req.query.from === CHECK_YOUR_ANSWERS_ORIGIN;
  }

  #shouldReturnToCheckYourAnswersFromRequest(req: Request): boolean {
    if (this.#isCheckYourAnswersOrigin(req)) {
      return true;
    }

    const decisionSessionData = this.sessionHelper.getSessionData(
      req,
      "decision",
    ) as DecisionSessionData | null;

    return this.#shouldReturnToCheckYourAnswers(decisionSessionData);
  }

  #hasCertificateStartDate(sessionData: DecisionSessionData): boolean {
    return Boolean(
      sessionData.certificateStartDateDay &&
      sessionData.certificateStartDateMonth &&
      sessionData.certificateStartDateYear,
    );
  }

  #hasRefusalDetails(sessionData: DecisionSessionData): boolean {
    return Boolean(sessionData.refusalReason && sessionData.justification);
  }
}
