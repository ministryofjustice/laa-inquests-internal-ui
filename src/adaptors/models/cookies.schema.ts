import { z } from "zod";

export const cookiePolicySchema = z.object({
  has_tracking_consent: z.boolean(),
});
