/**
 * API Handlers for MSW
 *
 * These handlers intercept outgoing HTTP requests that the Express application makes
 * to the Inquests API and serve mock responses.
 */

import { http, HttpResponse } from "msw";


/**
 * Mock application data for Inquests API
 */
const mockApplication = {
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
      proceedingId: "MN035",
      proceedingDescription: "Inquest ABC",
      categoryOfLaw: "INQUEST",
      certificateType: "SUBSTANTIVE",
      clientInvolvementType: "I",
      levelOfService: "FULL",
      matterType: "INQUEST",
      scopeLimitationHeading: "Scope",
      scopeDescription: "This is the scope description",
      substantiveCostLimitation: 5000,
      meritsDecision: "PENDING",
    },
  ],
  publicBodies: [
    {
      publicBodyId: "1",
      publicBodyDescription: "Test Public Body",
    },
  ],
  client: {
    clientId: 1,
    clientFirstName: "Test",
    clientLastName: "Client",
    clientLastNameAtBirth: null,
    dateOfBirth: "01-01-1990",
    nationalInsuranceNumber: "PC123456C",
    correspondenceAddress: null,
    homeAddress: null,
    hasAppliedPreviously: false,
    prevApplicationReference: null,
  },
  deceased: {
    deceasedId: 1,
    deceasedFirstName: "bob",
    deceasedLastName: "boberton",
    deceasedDateOfBirth: "01-01-2000",
    deceasedDateOfDeath: "01-01-2025",
    coronersReference: "123456",
    furtherInformation: "test information",
    clientRelationshipToDeceased: "guardian",
  },
};

/**
 * API handlers that intercept outbound requests from the Express app
 */
export const apiHandlers = [
  // Intercept LAA Inquests API requests
  http.get(
    "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk/applications/:applicationId",
    ({ params }) => {
      console.log(
        `🎭 MSW intercepted request to Inquests API for application ${params.applicationId}`,
      );
      return HttpResponse.json(mockApplication);
    },
  ),

  http.patch(
    "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk/applications/:applicationId/merits-decision",
    async ({ request, params }) => {
      const body = await request.json();
      console.log(
        `🎭 MSW intercepted PATCH request to Inquests API for application ${params.applicationId}`,
        body,
      );
      return HttpResponse.json({ success: true });
    },
  ),
];