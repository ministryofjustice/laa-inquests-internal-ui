import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { http, HttpResponse } from "msw";
import {
  GRANTED_DECISION,
  PENDING_DECISION,
  REFUSED_DECISION,
} from "#src/infrastructure/locales/constants.js";

/**
 * Application summaries returned by GET /applications/.
 * Shape matches the snake_case payload the real API returns for the list.
 */
const applicationSummaries = [
  {
    laa_reference: 1,
    created_at: "2026-05-18T15:49:07.455255",
    status: "LIVE",
    overall_decision: PENDING_DECISION,
  },
  {
    laa_reference: 2,
    created_at: "2026-05-19T15:49:07.455255",
    status: "LIVE",
    overall_decision: PENDING_DECISION,
  },
  {
    laa_reference: 3,
    created_at: "2026-07-13T09:00:00.000000",
    status: "LIVE",
    overall_decision: PENDING_DECISION,
  },
];

/**
 * Full application returned by GET /applications/:id.
 * Shape matches the camelCase payload the real API returns for a single application.
 */
const fullApplications = [
  {
    laaReference: 1,
    createdAt: "2026-05-18T15:49:07.455255",
    updatedAt: "2026-05-18T15:49:07.455279",
    status: "LIVE",
    usedDelegatedFunctions: true,
    applicationType: "INITIAL",
    autoGrant: true,
    overallDecision: PENDING_DECISION,
    proceeding: {
      proceedingId: "IQPC",
      proceedingName: "Death in police custody",
      proceedingDescription: "Death in police custody",
      categoryOfLaw: "INQUESTS",
      certificateType: "SUBSTANTIVE",
      levelOfService: "FULL_REPRESENTATION",
      matterType: "INQUESTS",
      scopeLimitationHeading: "FINAL_HEARING",
      scopeDescription: "This is the scope description",
      substantiveCostLimitation: 10000,
      clientInvolvementType: "RESPONDENT",
      meritsDecision: PENDING_DECISION,
    },
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
    coronersLetter: {
      fileName: "coroners_letter.png",
    },
  },
  {
    laaReference: 3,
    createdAt: "2026-05-18T15:49:07.455255",
    updatedAt: "2026-05-18T15:49:07.455279",
    status: "LIVE",
    usedDelegatedFunctions: true,
    applicationType: "INITIAL",
    autoGrant: true,
    overallDecision: PENDING_DECISION,
    proceeding: {
      proceedingId: "PC049",
      proceedingName: "CAPA",
      proceedingDescription: "CAPA",
      categoryOfLaw: "INQUESTS",
      certificateType: "SUBSTANTIVE",
      levelOfService: "FULL_REPRESENTATION",
      matterType: "INQUESTS",
      scopeLimitationHeading: "FINAL_HEARING",
      scopeDescription: "This is the scope description",
      substantiveCostLimitation: 10000,
      clientInvolvementType: "RESPONDENT",
      meritsDecision: PENDING_DECISION,
    },
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
    coronersLetter: {
      fileName: "coroners_letter.png",
    },
  },
];

const certificate = {
  laaReference: 1,
  dateCreated: "2026-05-19",
  clientName: "John Doe",
  clientAddress: {
    addressLine1: "1 Test Road",
    addressLine2: null,
    townOrCity: "London",
    county: null,
    postcode: "SW1A 1AA",
  },
  firmName: "Test Solicitors",
  officeAddress: {
    addressLine1: "Test Office Address",
    addressLine2: null,
    townOrCity: "London",
    county: null,
    postcode: "SW1A 1AA",
  },
  opponentDetails: ["Cabinet Office"],
  guardianName: "Not applicable",
  guardianAddress: "Not applicable",
  certificateType: "SUBSTANTIVE",
  status: "LIVE",
  effectiveDate: "2025-09-05",
  endDate: "Not applicable",
  reinstatementDate: "Not applicable",
  costLimitation: 10000,
  costLimitationEffectiveDate: "Not applicable",
  certificateLimitation: "Not applicable",
  proceedingName: "Description of proceeding",
  proceedingDescription: "Description of proceeding",
  categoryOfLaw: "INQUESTS",
  currentProceedingStatus: "LIVE",
  dateWorkCanCommence: "2025-09-05",
  proceedingEndDate: "Not applicable",
  clientInvolvementType: "Applicant",
  levelOfService: "FULL_REPRESENTATION",
  dateCurrentLevelOfServiceEffective: "2025-09-05",
  previousLevelOfService: "Not applicable",
  datePreviousLevelOfServiceEffective: "Not applicable",
  scopeLimitationHeading: "FINAL_HEARING",
  scopeLimitationDescription: "This is the scope description",
};

export const applicationHandlers = [
  http.get(`${TEST_CONFIG.INQUESTS_API_URL}/applications/`, () => {
    return HttpResponse.json(applicationSummaries);
  }),

  http.get(`${TEST_CONFIG.INQUESTS_API_URL}/applications/:id`, ({ params }) => {
    let fullApplication;
    if (params.id == "3") {
      fullApplication = fullApplications[1];
    } else {
      fullApplication = fullApplications[0];
    }

    const appToReturn = { ...fullApplication };
    const decision =
      applicationSummaries[Number(params.id) - 1].overall_decision;
    appToReturn.overallDecision = decision;
    appToReturn.proceeding!.meritsDecision = decision;
    appToReturn.laaReference = Number(params.id);

    return HttpResponse.json(appToReturn);
  }),

  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/refuse-decision`,
    ({ params }) => {
      applicationSummaries[Number(params.id) - 1].overall_decision =
        REFUSED_DECISION;
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/grant-decision`,
    ({ params }) => {
      applicationSummaries[Number(params.id) - 1].overall_decision =
        GRANTED_DECISION;
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/coroners-letter`,
    ({ params }) => {
      // Return a fake PNG image (1x1 transparent pixel)
      const fakeImageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      return new HttpResponse(fakeImageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
        },
      });
    },
  ),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/certificate`,
    ({ params }) => {
      if (params.id === "999") {
        return new HttpResponse(null, { status: 404 });
      }
      return HttpResponse.json(certificate);
    },
  ),
];
