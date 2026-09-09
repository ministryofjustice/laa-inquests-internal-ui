import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
} from "#tests/playwright/constants/httpStatus.js";

export const FAILED_APPLICATION_REFERENCE = "INQ-OVERVIEW-500";
export const INVALID_APPLICATION_REFERENCE = "INQ-OVERVIEW-INVALID";
export const UNAUTHORISED_HISTORY_REFERENCE = "INQ-HISTORY-401";
export const FORBIDDEN_HISTORY_REFERENCE = "INQ-HISTORY-403";
export const FAILED_HISTORY_REFERENCE = "INQ-HISTORY-500";
export const UNAUTHORISED_CORONERS_LETTER_REFERENCE = "INQ-LETTER-401";
export const FORBIDDEN_CORONERS_LETTER_REFERENCE = "INQ-LETTER-403";
export const MISSING_CORONERS_LETTER_REFERENCE = "INQ-LETTER-404";
export const FAILED_CORONERS_LETTER_REFERENCE = "INQ-LETTER-500";

const applicationUrl = (laaReference: string): string =>
  `${TEST_CONFIG.INQUESTS_API_URL}/applications/${laaReference}`;

const historyUrl = (laaReference: string): string =>
  `${applicationUrl(laaReference)}/history`;

const coronersLetterUrl = (laaReference: string): string =>
  `${applicationUrl(laaReference)}/coroners-letter`;

export const applicationOverviewErrorHandlers = [
  http.get(
    applicationUrl(FAILED_APPLICATION_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(applicationUrl(INVALID_APPLICATION_REFERENCE), () =>
    HttpResponse.json({ laaReference: INVALID_APPLICATION_REFERENCE }),
  ),
  http.get(
    historyUrl(UNAUTHORISED_HISTORY_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    historyUrl(FORBIDDEN_HISTORY_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
  http.get(
    historyUrl(FAILED_HISTORY_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(
    coronersLetterUrl(UNAUTHORISED_CORONERS_LETTER_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    coronersLetterUrl(FORBIDDEN_CORONERS_LETTER_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
  http.get(
    coronersLetterUrl(MISSING_CORONERS_LETTER_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    coronersLetterUrl(FAILED_CORONERS_LETTER_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
];
