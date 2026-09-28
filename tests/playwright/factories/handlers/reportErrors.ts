import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#tests/playwright/constants/httpStatus.js";

export const FAILED_PAYMENT_EXTRACT_FROM = "2025-01-01";

export const reportErrorHandlers = [
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/reports/payment-extract`,
    ({ request }) => {
      const { searchParams } = new URL(request.url);
      if (searchParams.get("from") === FAILED_PAYMENT_EXTRACT_FROM) {
        return new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR });
      }
      return undefined;
    },
  ),
];
