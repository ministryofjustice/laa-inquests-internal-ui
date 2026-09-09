import type { Request } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

const CHECK_YOUR_ANSWERS_ORIGIN = "check-your-answers";
const CLAIM_APPROVAL_NAMESPACE = "claimApproval";
const RETURN_TO_CHECK_YOUR_ANSWERS_FLAG = "true";

interface ClaimApprovalSessionData {
  returnToCheckYourAnswers?: string;
}

export class ClaimAssessmentNavigationHelper {
  constructor(private readonly sessionHelper: SessionHelper) {}

  prepareClaimAssessmentEntry(req: Request): void {
    if (req.method !== "GET") {
      return;
    }

    if (this.#isCheckYourAnswersOrigin(req)) {
      return;
    }

    this.sessionHelper.clearSessionData(req, CLAIM_APPROVAL_NAMESPACE);
  }

  prepareConfirmCostsEntry(req: Request): void {
    this.#resetReturnToCheckYourAnswersFlagForFreshEntry(req);
    this.#captureCheckYourAnswersEntry(req);
  }

  resolveBackUrl(
    req: Request,
    checkYourAnswersUrl: string,
    defaultUrl: string,
  ): string {
    return this.#shouldReturnToCheckYourAnswersFromRequest(req)
      ? checkYourAnswersUrl
      : defaultUrl;
  }

  resolveNextUrl(
    req: Request,
    checkYourAnswersUrl: string,
    defaultUrl: string,
  ): string {
    return this.#shouldReturnToCheckYourAnswersFromRequest(req)
      ? checkYourAnswersUrl
      : defaultUrl;
  }

  #shouldReturnToCheckYourAnswersFromRequest(req: Request): boolean {
    if (this.#isCheckYourAnswersOrigin(req)) {
      return true;
    }

    return this.#shouldReturnToCheckYourAnswers(req);
  }

  #shouldReturnToCheckYourAnswers(req: Request): boolean {
    const sessionData = this.sessionHelper.getSessionData(
      req,
      CLAIM_APPROVAL_NAMESPACE,
    ) as ClaimApprovalSessionData | null;

    return (
      sessionData?.returnToCheckYourAnswers ===
      RETURN_TO_CHECK_YOUR_ANSWERS_FLAG
    );
  }

  #captureCheckYourAnswersEntry(req: Request): void {
    if (req.method !== "GET") {
      return;
    }

    if (!this.#isCheckYourAnswersOrigin(req)) {
      return;
    }

    this.sessionHelper.storeSessionData(req, CLAIM_APPROVAL_NAMESPACE, {
      returnToCheckYourAnswers: RETURN_TO_CHECK_YOUR_ANSWERS_FLAG,
    });
  }

  #resetReturnToCheckYourAnswersFlagForFreshEntry(req: Request): void {
    if (req.method !== "GET") {
      return;
    }

    if (this.#isCheckYourAnswersOrigin(req)) {
      return;
    }

    if (this.#shouldReturnToCheckYourAnswers(req)) {
      this.sessionHelper.storeSessionData(req, CLAIM_APPROVAL_NAMESPACE, {
        returnToCheckYourAnswers: "",
      });
    }
  }

  #isCheckYourAnswersOrigin(req: Request): boolean {
    return req.query.from === CHECK_YOUR_ANSWERS_ORIGIN;
  }
}
