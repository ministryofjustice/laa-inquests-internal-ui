import type { z } from "zod";
import type { ClaimDetailSchema, ClaimSummarySchema } from "./claim.schema.js";

export type ClaimSummary = z.infer<typeof ClaimSummarySchema>;
export type ClaimDetail = z.infer<typeof ClaimDetailSchema>;
