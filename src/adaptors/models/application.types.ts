import type { z } from "zod";
import type {
  ApplicationSchema,
  ProceedingSchema,
} from "./application.schema.js";

export type Application = z.infer<typeof ApplicationSchema>;
export type Proceeding = z.infer<typeof ProceedingSchema>;
