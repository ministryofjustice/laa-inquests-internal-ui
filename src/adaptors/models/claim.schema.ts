import { z } from "zod";

const ClaimEvidenceSchema = z.object({
  claimEvidenceId: z.string(),
  fileName: z.string(),
});

const ClaimCostTemplateFileSchema = z.object({
  claimCostTemplateFileId: z.string(),
  claimCostTemplateFileName: z.string(),
});

const ClaimDecisionReasonSchema = z.object({
  reasonCode: z.string(),
  justification: z.string(),
});

const ClaimDecisionSchema = z.object({
  claimDecisionId: z.number(),
  decision: z.string(),
  decisionReasons: z.array(ClaimDecisionReasonSchema).optional().default([]),
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
  claimCostTemplateFile: ClaimCostTemplateFileSchema.optional().nullable(),
  claimEvidence: z.array(ClaimEvidenceSchema).optional(),
  claimDecision: ClaimDecisionSchema.optional().nullable(),
  inquestOutcomes: z.array(z.string()).optional().nullable(),
  hasAlternativeFunding: z.boolean().optional().nullable(),
  numberOfCounselInstructed: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),
  hasCounselBeenPaid: z.boolean().optional().nullable(),
  hasRecoveryCostsAwarded: z.boolean().optional().nullable(),
  financialRecoveryPreviousPreCertificateCosts: z
    .string()
    .optional()
    .nullable(),
  financialRecoveryCost: z.string().optional().nullable(),
  financialRecoveryDamages: z.string().optional().nullable(),
  financialRecoveryInterest: z.string().optional().nullable(),
  payingParty: z.string().optional().nullable(),
});

export const ClaimSummariesSchema = z.array(ClaimSummarySchema);
