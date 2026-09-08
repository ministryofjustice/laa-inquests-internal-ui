import type { Request } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

const CHECK_YOUR_ANSWERS_ORIGIN = "check-your-answers";
const CLAIM_APPROVAL_NAMESPACE = "claimApproval";

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

  #isCheckYourAnswersOrigin(req: Request): boolean {
    return req.query.from === CHECK_YOUR_ANSWERS_ORIGIN;
  }
}
