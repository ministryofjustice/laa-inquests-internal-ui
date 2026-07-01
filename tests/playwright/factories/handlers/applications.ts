import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { http, HttpResponse } from "msw";

/**
 * Application summaries returned by GET /applications/.
 * Shape matches the snake_case payload the real API returns for the list.
 */
const applicationSummaries = [
  {
    laa_reference: 1,
    created_at: "2026-05-18T15:49:07.455255",
    status: "LIVE",
    overall_decision: "PENDING",
  },
  {
    laa_reference: 2,
    created_at: "2026-05-19T15:49:07.455255",
    status: "LIVE",
    overall_decision: "GRANTED",
  },
];

/**
 * Full application returned by GET /applications/:id.
 * Shape matches the camelCase payload the real API returns for a single application.
 */
const fullApplication = {
  laaReference: 1,
  createdAt: "2026-05-18T15:49:07.455255",
  updatedAt: "2026-05-18T15:49:07.455279",
  status: "LIVE",
  usedDelegatedFunctions: true,
  applicationType: "INITIAL",
  autoGrant: true,
  overallDecision: "PENDING",
  proceedings: [
    {
      proceedingId: "PC049",
      proceedingDescription: "CAPA",
      categoryOfLaw: "INQUESTS",
      certificateType: "SUBSTANTIVE",
      levelOfService: "FULL_REPRESENTATION",
      matterType: "INQUESTS",
      scopeLimitationHeading: "FINAL_HEARING",
      scopeDescription: "This is the scope description",
      substantiveCostLimitation: 25000,
      clientInvolvementType: "RESPONDENT",
      meritsDecision: "PENDING",
    },
  ],
  publicBodies: [
    {
      publicBodyId: "Department for Transport",
      publicBodyDescription: "Department for Transport",
    },
  ],
  provider: {
    firmName: "Test Firm Ltd",
    accountNumber: "0KA123",
    emailAddress: "testfirm@example.com",
  },
  correspondenceRecipient: null,
  client: {
    clientId: 1,
    clientFirstName: "Test",
    clientLastName: "Surname",
    clientLastNameAtBirth: "Birthname",
    dateOfBirth: "01-01-1990",
    nationalInsuranceNumber: "PC123456C",
    correspondenceAddressSource: "USE_CLIENT_HOME_ADDRESS",
    correspondenceAddress: null,
    homeAddress: {
      addressLine1: "1 High Street",
      addressLine2: null,
      townOrCity: "London",
      county: "Greater London",
      postcode: "SW1A 1AA",
    },
    hasAppliedPreviously: false,
    prevApplicationReference: null,
    hasNoFixedAbode: false,
    isClientCorrespondenceRecipient: true,
  },
  deceased: {
    deceasedId: 1,
    deceasedFirstName: "Bob",
    deceasedLastName: "Boberton",
    deceasedDateOfBirth: "01-01-2000",
    deceasedDateOfDeath: "01-01-2025",
    coronersReference: "123456",
    furtherInformation: "Test information",
    clientRelationshipToDeceased: "Guardian",
  },
};

export const applicationHandlers = [
  http.get(`${TEST_CONFIG.INQUESTS_API_URL}/applications/`, () =>
    HttpResponse.json(applicationSummaries),
  ),

  http.get(`${TEST_CONFIG.INQUESTS_API_URL}/applications/:id`, ({ params }) =>
    HttpResponse.json({
      ...fullApplication,
      laaReference: Number(params.id),
    }),
  ),

  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/merits-decision`,
    () => new HttpResponse(null, { status: 204 }),
  ),
];
