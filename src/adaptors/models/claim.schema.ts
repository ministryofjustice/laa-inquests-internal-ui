import { z } from "zod";

const ClaimEvidenceSchema = z.object({
  fileName: z.string(),
});

const ClaimDecisionSchema = z.object({
  claimDecisionId: z.number(),
  decision: z.string(),
  decisionReasons: z.array(z.string()).optional().default([]),
});

export const ClaimSchema = z.object({
  claimId: z.number(),
  claimTypeId: z.string(),
  submissionDate: z.string(),
  totalProfitCostNet: z.string().optional().nullable(),
  totalProfitCostGross: z.string().optional().nullable(),
  totalProfitCostVatZero: z.string().optional().nullable(),
  poaTypeId: z.string().optional().nullable(),
  statusId: z.string().optional().nullable(),
  claimDecisionStatus: z.string().optional().nullable(),
  substantiveCostLimitation: z.number().optional().nullable(),
  claimEvidence: z.array(ClaimEvidenceSchema).optional(),
  claimDecision: ClaimDecisionSchema.optional().nullable(),
});

export const ClaimsSchema = z.array(ClaimSchema);
