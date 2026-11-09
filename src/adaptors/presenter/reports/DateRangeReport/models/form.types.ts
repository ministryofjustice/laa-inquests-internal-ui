export interface DateRangeReportForm {
  "start-date-day": string;
  "start-date-month": string;
  "start-date-year": string;
  "end-date-day": string;
  "end-date-month": string;
  "end-date-year": string;
}

export type DateField = "day" | "month" | "year";

export interface DateRangeReportFormError {
  text: string;
  // The input boxes to highlight; the summary link targets the first one.
  fields: DateField[];
  // False when another error already links to the same problem.
  inSummary?: boolean;
}

export interface DateRangeReportFormErrors {
  startDate?: DateRangeReportFormError;
  endDate?: DateRangeReportFormError;
}
