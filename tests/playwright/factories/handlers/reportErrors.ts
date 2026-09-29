import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import {
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNPROCESSABLE_ENTITY,
} from "#tests/playwright/constants/httpStatus.js";

export const FAILED_PAYMENT_EXTRACT_FROM = "2025-01-01";
const MAX_PAYMENT_EXTRACT_RANGE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export const reportErrorHandlers = [
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/reports/payment-extract`,
    ({ request }) => {
      const { searchParams } = new URL(request.url);
      if (searchParams.get("from") === FAILED_PAYMENT_EXTRACT_FROM) {
        return new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR });
      }
      const rangeDays =
        (Date.parse(searchParams.get("to") ?? "") -
          Date.parse(searchParams.get("from") ?? "")) /
        MS_PER_DAY;
      if (rangeDays > MAX_PAYMENT_EXTRACT_RANGE_DAYS) {
        return HttpResponse.json(
          {
            detail:
              "Invalid date range: The date range must not exceed 90 days.",
          },
          { status: HTTP_UNPROCESSABLE_ENTITY },
        );
      }
      return undefined;
    },
  ),
];
