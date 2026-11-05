import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface DateRangeReportForm {
  "start-date-day": string;
  "start-date-month": string;
  "start-date-year": string;
  "end-date-day": string;
  "end-date-month": string;
  "end-date-year": string;
}

export interface DateRangeReportFormErrors {
  startDate?: FormErrorMessage;
  endDate?: FormErrorMessage;
}
