import { z } from "zod";

const ClaimEvidenceSchema = z.object({
  claimEvidenceId: z.string(),
  fileName: z.string(),
});

const ClaimDecisionSchema = z.object({
  claimDecisionId: z.number(),
  decision: z.string(),
  decisionReasons: z.array(z.string()).optional().default([]),
});

const BaseClaimSchema = z.object({
  claimId: z.number(),
  claimTypeId: z.string(),
  submissionDate: z.string(),
  totalProfitCostNet: z.string().optional().nullable(),
  totalProfitCostGross: z.string().optional().nullable(),
  totalProfitCostVatZero: z.string().optional().nullable(),
  totalFundsRemainingAfterClaim: z.string(),
  poaTypeId: z.string().optional().nullable(),
  statusId: z.string().optional().nullable(),
  claimDecisionStatus: z.string().optional().nullable(),
});

export const ClaimSummarySchema = BaseClaimSchema;

export const ClaimDetailSchema = BaseClaimSchema.extend({
  substantiveCostLimitation: z.number().optional().nullable(),
  claimEvidence: z.array(ClaimEvidenceSchema).optional(),
  claimDecision: ClaimDecisionSchema.optional().nullable(),
});

export const ClaimSummariesSchema = z.array(ClaimSummarySchema);
