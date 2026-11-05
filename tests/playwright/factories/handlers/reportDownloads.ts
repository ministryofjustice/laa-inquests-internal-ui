import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";

export const REPORT_CSV = "Column A,Column B\nvalue a,value b\n";

const DATE_RANGE_DOWNLOADS = [
  { path: "/reports/decisions", filePrefix: "decisions" },
  { path: "/reports/ogd-costs", filePrefix: "ogd_costs" },
  { path: "/reports/audit-trail", filePrefix: "audit_trail" },
] as const;

const dateRangeDownloadHandlers = DATE_RANGE_DOWNLOADS.map(
  ({ path, filePrefix }) =>
    http.get(`${TEST_CONFIG.INQUESTS_API_URL}${path}`, ({ request }) => {
      const { searchParams } = new URL(request.url);
      const from = searchParams.get("from") ?? "";
      const to = searchParams.get("to") ?? "";

      return new HttpResponse(Buffer.from(REPORT_CSV), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=${filePrefix}_${from}_${to}.csv`,
        },
      });
    }),
);

export const reportDownloadHandlers = [
  ...dateRangeDownloadHandlers,
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/reports/cost-limit-forecast`,
    () =>
      new HttpResponse(Buffer.from(REPORT_CSV), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=cost_limit_forecast.csv",
        },
      }),
  ),
];
