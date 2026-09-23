import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import { claimDetail } from "#tests/playwright/factories/handlers/applications.js";
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_REQUEST,
  HTTP_UNPROCESSABLE_ENTITY,
} from "#tests/playwright/constants/httpStatus.js";

export const CLAIM_APPLICATION_REFERENCE = "INQ-YYY-005";
export const UNAUTHORISED_CLAIM_ID = "claim-401";
export const FORBIDDEN_CLAIM_ID = "claim-403";
export const MISSING_CLAIM_ID = "claim-404";
export const FAILED_CLAIM_ID = "claim-500";
export const INVALID_CLAIM_ID = "claim-invalid";
export const FAILED_REJECTION_CLAIM_ID = "reject-500";
const FAILED_REJECTION_CLAIM_API_ID = "999";
export const PAY_IN_FULL_MIXED_VAT_CLAIM_ID = "INQC-0020-0020";
export const PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID = "INQC-0021-0021";
export const PAY_IN_FULL_MIXED_VAT_ERROR_CODE = "PROFIT_COST_MIXED_VAT";
export const PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID = "INQC-0022-0022";
export const PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID = "INQC-0023-0023";
export const PAY_IN_FULL_DISBURSEMENT_GROSS_UPSTREAM_MESSAGE =
  "The gross total must be greater than the 0% VAT and net total combined";
export const PAY_IN_FULL_422_UNKNOWN_CODE_UPSTREAM_MESSAGE =
  "An unprocessable upstream message we should not surface";
export const UNAUTHORISED_EVIDENCE_ID = "evidence-401";
export const MISSING_EVIDENCE_ID = "evidence-404";
export const FAILED_EVIDENCE_ID = "evidence-500";

const claimUrl = (claimReference: string): string =>
  `${TEST_CONFIG.INQUESTS_API_URL}/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${claimReference}`;

export const claimErrorHandlers = [
  http.get(
    claimUrl(UNAUTHORISED_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    claimUrl(FORBIDDEN_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
  http.get(
    claimUrl(MISSING_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    claimUrl(FAILED_CLAIM_ID),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(claimUrl(INVALID_CLAIM_ID), () =>
    HttpResponse.json({ claimReference: INVALID_CLAIM_ID }),
  ),
  http.get(claimUrl(FAILED_REJECTION_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimReference: FAILED_REJECTION_CLAIM_API_ID,
    }),
  ),
  http.patch(
    `${claimUrl(FAILED_REJECTION_CLAIM_API_ID)}/reject`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(claimUrl(PAY_IN_FULL_MIXED_VAT_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimReference: PAY_IN_FULL_MIXED_VAT_CLAIM_ID,
    }),
  ),
  http.patch(`${claimUrl(PAY_IN_FULL_MIXED_VAT_CLAIM_ID)}/pay-in-full`, () =>
    HttpResponse.json(
      {
        detail: {
          errorCode: PAY_IN_FULL_MIXED_VAT_ERROR_CODE,
          message:
            "You cannot submit a total profit cost claim with both 0% and 20% VAT",
        },
      },
      { status: HTTP_BAD_REQUEST },
    ),
  ),
  http.get(claimUrl(PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimReference: PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID,
    }),
  ),
  http.patch(`${claimUrl(PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID)}/pay-in-full`, () =>
    HttpResponse.json(
      {
        detail: {
          errorCode: "SOME_UNMAPPED_ERROR_CODE",
          message: "An upstream validation message we should not surface",
        },
      },
      { status: HTTP_BAD_REQUEST },
    ),
  ),
  http.get(claimUrl(PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimReference: PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID,
    }),
  ),
  http.patch(
    `${claimUrl(PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID)}/pay-in-full`,
    () =>
      HttpResponse.json(
        {
          detail: {
            errorCode: "DISBURSEMENT_GROSS_NOT_GREATER_THAN_TOTAL",
            message: PAY_IN_FULL_DISBURSEMENT_GROSS_UPSTREAM_MESSAGE,
          },
        },
        { status: HTTP_UNPROCESSABLE_ENTITY },
      ),
  ),
  http.get(claimUrl(PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID), () =>
    HttpResponse.json({
      ...claimDetail,
      claimReference: PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID,
    }),
  ),
  http.patch(
    `${claimUrl(PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID)}/pay-in-full`,
    () =>
      HttpResponse.json(
        {
          detail: {
            errorCode: "SOME_UNMAPPED_ERROR_CODE",
            message: PAY_IN_FULL_422_UNKNOWN_CODE_UPSTREAM_MESSAGE,
          },
        },
        { status: HTTP_UNPROCESSABLE_ENTITY },
      ),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${UNAUTHORISED_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${MISSING_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    `${TEST_CONFIG.INQUESTS_API_URL}/claims/${FAILED_EVIDENCE_ID}`,
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
];
