import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#tests/playwright/constants/httpStatus.js";

export const FAILED_GRANT_DECISION_REFERENCE = "INQ-YYY-GRANT-500";
export const FAILED_REFUSE_DECISION_REFERENCE = "INQ-YYY-REFUSE-500";

export const decisionErrorHandlers = [
  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/${FAILED_GRANT_DECISION_REFERENCE}/grant-decision`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/${FAILED_REFUSE_DECISION_REFERENCE}/refuse-decision`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
];
