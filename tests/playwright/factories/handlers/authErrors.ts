import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { http, HttpResponse } from "msw";
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
} from "#tests/playwright/constants/httpStatus.js";

// References reserved for exercising API auth failures; no fixture data exists for them.
export const UNAUTHORISED_APPLICATION_REFERENCE = "INQ-401-001";
export const FORBIDDEN_APPLICATION_REFERENCE = "INQ-403-001";

export const authErrorHandlers = [
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/${UNAUTHORISED_APPLICATION_REFERENCE}`,
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/${FORBIDDEN_APPLICATION_REFERENCE}`,
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
];
