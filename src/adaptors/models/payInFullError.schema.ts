import { z } from "zod";

export const PayInFullValidationErrorSchema = z.object({
  detail: z.object({
    errorCode: z.string().min(1),
    message: z.string(),
  }),
});
