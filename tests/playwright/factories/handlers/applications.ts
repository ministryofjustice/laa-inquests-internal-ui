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
  {
    laa_reference: 4,
    created_at: "2026-07-14T09:00:00.000000",
    status: "LIVE",
    overall_decision: PENDING_DECISION,
  },
  {
    laa_reference: 5,
    created_at: "2026-07-15T09:00:00.000000",
    status: "LIVE",
    overall_decision: GRANTED_DECISION,
  },
  {
    laa_reference: 6,
    created_at: "2026-07-16T09:00:00.000000",
    status: "LIVE",
    overall_decision: GRANTED_DECISION,
  },
  {
    laa_reference: 7,
    created_at: "2026-07-17T09:00:00.000000",
    status: "LIVE",
    overall_decision: GRANTED_DECISION,
  },
  {
    laa_reference: 8,
    created_at: "2026-07-18T09:00:00.000000",
    status: "LIVE",
    overall_decision: GRANTED_DECISION,
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

const toBeAssessedClaims = [
  {
    claimId: 10,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-10T13:37:56.629563",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
  },
  {
    claimId: 12,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-11T13:37:56.629563",
    totalProfitCostNet: null,
    totalProfitCostGross: null,
    totalProfitCostVatZero: "800.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
  },
];

const assessedClaims = [
  {
    claimId: 20,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-07-01T09:00:00.000000",
    totalProfitCostNet: "1600.00",
    totalProfitCostGross: "2000.00",
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "PAY_IN_FULL",
    claimDecisionStatus: "PAY_IN_FULL",
  },
];

const claimDetail = {
  claimId: 10,
  claimTypeId: "PAYMENT_ON_ACCOUNT",
  submissionDate: "2026-08-10T13:37:56.629563",
  totalProfitCostNet: "1000.00",
  totalProfitCostGross: "1200.00",
  totalProfitCostVatZero: null,
  poaTypeId: "PROFIT_COST",
  substantiveCostLimitation: 10000,
  claimEvidence: [
    {
      claimEvidenceId: "test_evidence_1",
      fileName: "claim-evidence-1.pdf",
    },
    {
      claimEvidenceId: "test_evidence_2",
      fileName: "claim-evidence-2.pdf",
    },
  ],
  claimDecision: {
    claimDecisionId: 123,
    decision: "REJECT",
    decisionReasons: [],
  },
};

const claimDetailWithoutEvidence = {
  ...claimDetail,
  claimId: 11,
  claimEvidence: [],
};

const claimDetailVatZeroOnly = {
  ...claimDetail,
  claimId: 12,
  totalProfitCostNet: null,
  totalProfitCostGross: null,
  totalProfitCostVatZero: "800.00",
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
    const matchingSummary = applicationSummaries.find(
      (applicationSummary) =>
        applicationSummary.laa_reference === Number(params.id),
    );
    const decision = matchingSummary?.overall_decision ?? PENDING_DECISION;
    appToReturn.overallDecision = decision;
    appToReturn.proceeding!.meritsDecision = decision;
    appToReturn.laaReference = Number(params.id);

    return HttpResponse.json(appToReturn);
  }),

  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/refuse-decision`,
    ({ params }) => {
      const matchingSummary = applicationSummaries.find(
        (applicationSummary) =>
          applicationSummary.laa_reference === Number(params.id),
      );
      if (matchingSummary) {
        matchingSummary.overall_decision = REFUSED_DECISION;
      }
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.patch(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/grant-decision`,
    ({ params }) => {
      const matchingSummary = applicationSummaries.find(
        (applicationSummary) =>
          applicationSummary.laa_reference === Number(params.id),
      );
      if (matchingSummary) {
        matchingSummary.overall_decision = GRANTED_DECISION;
      }
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

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/:claimEvidenceId`,
    ({ params, request }) => {
      const url = new URL(request.url);
      const disposition = url.searchParams.get("disposition");

      if (
        (params.claimEvidenceId === "test_evidence_1" ||
          params.claimEvidenceId === "test_evidence_2") &&
        (disposition === "inline" || disposition === "attachment")
      ) {
        const fileName = `claim-evidence-${params.claimEvidenceId}.pdf`;
        const fakeEvidenceBuffer = Buffer.from("%PDF-1.4 mock evidence");
        return new HttpResponse(fakeEvidenceBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${fileName}"`,
          },
        });
      }

      return new HttpResponse(null, { status: 404 });
    },
  ),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/claims/:claimId`,
    ({ params }) => {
      if (params.id === "5" && params.claimId === "10") {
        return HttpResponse.json(claimDetail);
      }

      if (params.id === "5" && params.claimId === "11") {
        return HttpResponse.json(claimDetailWithoutEvidence);
      }

      if (params.id === "5" && params.claimId === "12") {
        return HttpResponse.json(claimDetailVatZeroOnly);
      }

      return new HttpResponse(null, { status: 404 });
    },
  ),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/reports/applications/backlog`,
    () => {
      const backlogCsv = Buffer.from(
        "Application / Case Reference Number,Current Application Status,Application Received Date,Firm Name,Firm Account Number,Proceeding Code,Matter Type\n" +
          "1,PENDING,2026-07-27 08:49:34,YOUNG SWISTAK,1473,IQPO,INQUESTS\n" +
          "2,PENDING,2026-07-27 10:18:22,YOUNG SWISTAK,1473,IQOT,INQUESTS\n" +
          "10,PENDING,2026-07-28 13:48:32,SWITALSKI'S SOLICITORS LTD,3637,IQOT,INQUESTS\n",
      );
      return new HttpResponse(backlogCsv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
        },
      });
    },
  ),

  http.get(`${TEST_CONFIG.INQUESTS_API_URL}/reports/claims/backlog`, () => {
    const claimsBacklogCsv = Buffer.from(
      "Application / Case Reference Number,Current Application Status,Application Received Date,Firm Name,Firm Account Number,Proceeding Code,Matter Type\n" +
        "1,PENDING,2026-07-27 08:49:34,YOUNG SWISTAK,1473,IQPO,INQUESTS\n" +
        "2,PENDING,2026-07-27 10:18:22,YOUNG SWISTAK,1473,IQOT,INQUESTS\n" +
        "10,PENDING,2026-07-28 13:48:32,SWITALSKI'S SOLICITORS LTD,3637,IQOT,INQUESTS\n",
    );

    return new HttpResponse(claimsBacklogCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
      },
    });
  }),

  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/applications/:id/claims`,
    ({ params, request }) => {
      // Simulate an upstream failure so the Claims tab can degrade gracefully.
      if (params.id === "998") {
        return new HttpResponse(null, { status: 500 });
      }

      const url = new URL(request.url);
      const assessed = url.searchParams.get("assessed") === "true";

      // id 7: no claims at all (empty state).
      if (params.id === "7") {
        return HttpResponse.json([]);
      }

      // id 6: only claims to be assessed (no assessed claims).
      if (params.id === "6") {
        return HttpResponse.json(assessed ? [] : toBeAssessedClaims);
      }

      // id 8: only assessed claims (nothing to be assessed).
      if (params.id === "8") {
        return HttpResponse.json(assessed ? assessedClaims : []);
      }

      // Default (e.g. id 5): both lists populated.
      return HttpResponse.json(assessed ? assessedClaims : toBeAssessedClaims);
    },
  ),
];
