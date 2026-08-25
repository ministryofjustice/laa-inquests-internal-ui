import type { z } from "zod";
import type {
  ApplicationSchema,
  ApplicationSummarySchema,
  CertificateSchema,
  HistoryEventSchema,
  ProceedingSchema,
  PublicBodySchema,
} from "./application.schema.js";

export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationSummary = z.infer<typeof ApplicationSummarySchema>;
export type Proceeding = z.infer<typeof ProceedingSchema>;
export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type PublicBody = z.infer<typeof PublicBodySchema>;

export enum RefusalReason {
  NOT_IN_SCOPE = "NOT_IN_SCOPE",
  INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION",
  DUPLICATE_CASE = "DUPLICATE_CASE",
}

export const REFUSAL_REASON_MAP: Record<string, RefusalReason> = {
  "not-in-scope": RefusalReason.NOT_IN_SCOPE,
  "insufficient-information": RefusalReason.INSUFFICIENT_INFORMATION,
  "duplicate-case": RefusalReason.DUPLICATE_CASE,
};

export type Certificate = z.infer<typeof CertificateSchema>;
