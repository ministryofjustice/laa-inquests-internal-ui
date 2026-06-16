import { z } from "zod";

const AddressSchema = z.object({
  addressLine1: z.string(),
  addressLine2: z.string().optional().nullable(),
  townOrCity: z.string(),
  county: z.string().optional().nullable(),
  postcode: z.string(),
});

const ClientSchema = z.object({
  clientId: z.number(),
  clientFirstName: z.string(),
  clientLastName: z.string(),
  clientLastNameAtBirth: z.string().optional().nullable(),
  dateOfBirth: z.string(),
  nationalInsuranceNumber: z.string().optional().nullable(),
  correspondenceAddressSource: z.string(),
  correspondenceAddress: AddressSchema.optional().nullable(),
  homeAddress: AddressSchema.optional().nullable(),
  hasAppliedPreviously: z.boolean().optional().nullable(),
  prevApplicationReference: z.string().optional().nullable(),
  hasNoFixedAbode: z.boolean().optional().nullable(),
  isClientCorrespondenceRecipient: z.boolean().optional().nullable(),
});

const CorrespondenceRecipientSchema = z.object({
  recipientType: z.string(),
  recipientName: z.string(),
});

const DeceasedSchema = z.object({
  deceasedId: z.number(),
  deceasedFirstName: z.string(),
  deceasedLastName: z.string(),
  deceasedDateOfBirth: z.string(),
  deceasedDateOfDeath: z.string(),
  coronersReference: z.string(),
  furtherInformation: z.string(),
  clientRelationshipToDeceased: z.string(),
});

export const ProceedingSchema = z.object({
  proceedingId: z.string(),
  proceedingDescription: z.string().optional().nullable(),
  categoryOfLaw: z.string(),
  certificateType: z.string(),
  levelOfService: z.string(),
  matterType: z.string(),
  scopeLimitationHeading: z.string(),
  scopeDescription: z.string(),
  substantiveCostLimitation: z.number(),
  clientInvolvementType: z.string(),
  meritsDecision: z.string(),
});

const PublicBodySchema = z.object({
  publicBodyId: z.string(),
  publicBodyDescription: z.string(),
});

export const ApplicationSchema = z.object({
  laaReference: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().optional().nullable(),
  status: z.string(),
  usedDelegatedFunctions: z.boolean().optional().nullable(),
  applicationType: z.string(),
  autoGrant: z.boolean(),
  overallDecision: z.string().optional().nullable(),
  proceedings: z.array(ProceedingSchema),
  publicBodies: z.array(PublicBodySchema),
  correspondenceRecipient: CorrespondenceRecipientSchema.optional().nullable(),
  client: ClientSchema,
  deceased: DeceasedSchema,
});

export const ApplicationSummarySchema = z.object({
  laaReference: z.number().nullable(),
  createdAt: z.string(),
  status: z.string().nullable(),
  overallDecision: z.string().nullable(),
});
