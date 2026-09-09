import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { claimDetail } from "#tests/playwright/factories/handlers/applications.js";

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export const CLAIM_APPLICATION_REFERENCE = "INQ-YYY-005";
export const UNAUTHORISED_CLAIM_ID = "claim-401";
export const FORBIDDEN_CLAIM_ID = "claim-403";
export const MISSING_CLAIM_ID = "claim-404";
export const FAILED_CLAIM_ID = "claim-500";
export const INVALID_CLAIM_ID = "claim-invalid";
export const FAILED_REJECTION_CLAIM_ID = "reject-500";
const FAILED_REJECTION_CLAIM_API_ID = "999";
export const UNAUTHORISED_EVIDENCE_ID = "evidence-401";
export const MISSING_EVIDENCE_ID = "evidence-404";
export const FAILED_EVIDENCE_ID = "evidence-500";

const claimUrl = (claimId: string): string =>
  `${TEST_CONFIG.INQUESTS_API_URL}/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${claimId}`;

export const claimErrorHandlers = [
  http.get(
    claimUrl(UNAUTHORISED_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    claimUrl(FORBIDDEN_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
  http.get(
    claimUrl(MISSING_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    claimUrl(FAILED_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(claimUrl(INVALID_CLAIM_ID), () =>
    HttpResponse.json({ claimId: INVALID_CLAIM_ID }),
  ),
  http.get(claimUrl(FAILED_REJECTION_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimId: Number(FAILED_REJECTION_CLAIM_API_ID),
    }),
  ),
  http.patch(
    `${claimUrl(FAILED_REJECTION_CLAIM_API_ID)}/reject`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${UNAUTHORISED_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${MISSING_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${FAILED_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
];
