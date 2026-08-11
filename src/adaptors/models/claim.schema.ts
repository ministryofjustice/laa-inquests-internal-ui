import { z } from "zod";

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
});

export const ClaimsSchema = z.array(ClaimSchema);
