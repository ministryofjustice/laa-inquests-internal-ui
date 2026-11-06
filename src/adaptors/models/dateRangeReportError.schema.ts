import { z } from "zod";

export const DateRangeReportErrorSchema = z.object({
  detail: z.string(),
});
