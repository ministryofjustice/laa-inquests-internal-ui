import type { z } from "zod";
import type {
  ApplicationSchema,
  ApplicationSummarySchema,
  ProceedingSchema,
} from "./application.schema.js";

export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationSummary = z.infer<typeof ApplicationSummarySchema>;
export type Proceeding = z.infer<typeof ProceedingSchema>;
