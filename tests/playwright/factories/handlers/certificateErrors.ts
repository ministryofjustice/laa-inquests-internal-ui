import { http, HttpResponse } from "msw";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
} from "#tests/playwright/constants/httpStatus.js";

export const UNAUTHORISED_CERTIFICATE_REFERENCE = "INQ-CERT-401";
export const FORBIDDEN_CERTIFICATE_REFERENCE = "INQ-CERT-403";
export const MISSING_CERTIFICATE_REFERENCE = "INQ-CERT-404";
export const FAILED_CERTIFICATE_REFERENCE = "INQ-CERT-500";
export const INVALID_CERTIFICATE_REFERENCE = "INQ-CERT-INVALID";

const certificateUrl = (laaReference: string): string =>
  `${TEST_CONFIG.INQUESTS_API_URL}/applications/${laaReference}/certificate`;

export const certificateErrorHandlers = [
  http.get(
    certificateUrl(UNAUTHORISED_CERTIFICATE_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_UNAUTHORIZED }),
  ),
  http.get(
    certificateUrl(FORBIDDEN_CERTIFICATE_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_FORBIDDEN }),
  ),
  http.get(
    certificateUrl(MISSING_CERTIFICATE_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_NOT_FOUND }),
  ),
  http.get(
    certificateUrl(FAILED_CERTIFICATE_REFERENCE),
    () => new HttpResponse(null, { status: HTTP_INTERNAL_SERVER_ERROR }),
  ),
  http.get(certificateUrl(INVALID_CERTIFICATE_REFERENCE), () =>
    HttpResponse.json({ laaReference: INVALID_CERTIFICATE_REFERENCE }),
  ),
];
