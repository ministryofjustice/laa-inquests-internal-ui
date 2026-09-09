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

  clearChangeLinkReturnOnFreshVisit(req: Request): void {
    if (!this.#isFirstVisitNotViaChangeLink(req)) {
      return;
    }

    this.sessionHelper.clearSessionData(req, CLAIM_APPROVAL_NAMESPACE);
  }

  syncChangeLinkReturnFlag(req: Request): void {
    this.#clearStaleChangeLinkReturnFlag(req);
    this.#rememberChangeLinkOrigin(req);
  }

  resolveBackLinkUrl(
    req: Request,
    checkYourAnswersUrl: string,
    defaultUrl: string,
  ): string {
    return this.#isReturningViaChangeLink(req)
      ? checkYourAnswersUrl
      : defaultUrl;
  }

  resolveContinueUrl(
    req: Request,
    checkYourAnswersUrl: string,
    defaultUrl: string,
  ): string {
    return this.#isReturningViaChangeLink(req)
      ? checkYourAnswersUrl
      : defaultUrl;
  }

  #isReturningViaChangeLink(req: Request): boolean {
    if (this.#isChangeLinkOrigin(req)) {
      return true;
    }

    return this.#hasChangeLinkReturnFlag(req);
  }

  #hasChangeLinkReturnFlag(req: Request): boolean {
    const sessionData = this.sessionHelper.getSessionData(
      req,
      CLAIM_APPROVAL_NAMESPACE,
    ) as ClaimApprovalSessionData | null;

    return (
      sessionData?.returnToCheckYourAnswers ===
      RETURN_TO_CHECK_YOUR_ANSWERS_FLAG
    );
  }

  #rememberChangeLinkOrigin(req: Request): void {
    if (req.method !== "GET" || !this.#isChangeLinkOrigin(req)) {
      return;
    }

    this.sessionHelper.storeSessionData(req, CLAIM_APPROVAL_NAMESPACE, {
      returnToCheckYourAnswers: RETURN_TO_CHECK_YOUR_ANSWERS_FLAG,
    });
  }

  #clearStaleChangeLinkReturnFlag(req: Request): void {
    if (
      this.#isFirstVisitNotViaChangeLink(req) &&
      this.#hasChangeLinkReturnFlag(req)
    ) {
      this.sessionHelper.storeSessionData(req, CLAIM_APPROVAL_NAMESPACE, {
        returnToCheckYourAnswers: "",
      });
    }
  }

  #isFirstVisitNotViaChangeLink(req: Request): boolean {
    return req.method === "GET" && !this.#isChangeLinkOrigin(req);
  }

  #isChangeLinkOrigin(req: Request): boolean {
    return req.query.from === CHECK_YOUR_ANSWERS_ORIGIN;
  }
}
