import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#tests/playwright/constants/httpStatus.js";

// A from date that makes any date range report endpoint fail upstream.
export const FAILED_REPORT_FROM = "2025-01-01";

export const DATE_RANGE_REPORT_API_PATHS = [
  "/reports/payment-extract",
  "/reports/decisions",
  "/reports/ogd-costs",
  "/reports/audit-trail",
] as const;

export const reportErrorHandlers = DATE_RANGE_REPORT_API_PATHS.map((path) =>
  http.get(`${TEST_CONFIG.INQUESTS_API_URL}${path}`, ({ request }) => {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("from") === FAILED_REPORT_FROM) {
      return new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR });
    }
    return undefined;
  }),
);
