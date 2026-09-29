import { z } from "zod";

export const PaymentExtractDateRangeErrorSchema = z.object({
  detail: z.string(),
});
