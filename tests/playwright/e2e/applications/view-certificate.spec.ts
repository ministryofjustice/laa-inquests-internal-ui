import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

// import {
//   checkSummaryListTableValues,
//   getOpponentName,
// } from "#tests/e2e/utils/utils.js";
// import {
//   convertNumberToCurrency,
//   convertToHumanReadableDate,
// } from "#src/utils/common.format.js";
// import { applicationEnumMap } from "#src/utils/constants/decide-service-enums.js";
// import { testDataFactory } from "#tests/e2e/test-setup/global-setup.js";
// import { resetToTwoLeadApplications } from "#tests/e2e/test-setup/test-data-helpers.js";
// import { baseUrlProvider } from "#src/infrastructure/express/routes/dependency-injection.js";

const applicationId = "1";
const certificateLocale = en.pages.applicationCertificate;

const applicationOverviewUrl = `/applications/${applicationId}/overview`;
const applicationCertificateUrl = `/applications/${applicationId}/certificate`;

test.describe.only("View certificate page", () => {
  test.describe("Page structure", () => {
    test("back button links back to applications list", async ({ page }) => {
      await page.goto(applicationCertificateUrl);
      await validateGovPage(page, {
        headerText: certificateLocale.title,
        backUrl: applicationOverviewUrl,
      });
    });

    // test("displays heading for Search", async ({ page }) => {
    //   const applicationId = testDataFactory.laaRefToAppId("L-000-001");
    //   await page.goto(`/applications/${applicationId}/certificate`);
    //   const title = page.getByRole("heading", { level: 1 });
    //   await expect(title).toHaveText("Civil Legal Aid Certificate");
    //   await expect(title).toBeVisible();
    // });
    // test("should have correct page structure", async ({ page }) => {
    //   const applicationId = testDataFactory.laaRefToAppId("L-000-001");
    //   await page.goto(`/applications/${applicationId}/certificate`);

    //   const certificate =
    //     testDataFactory.selectCertificateByApplicationId(applicationId);
    //   const clientName = page.getByText(
    //     `Applicant: ${certificate.client.firstName} ${
    //       certificate.client.lastName
    //     }`,
    //   );
    //   const referenceNumber = page.getByText(
    //     `Reference number: ${certificate.laaReference}`,
    //   );
    //   const createdOn = page.getByText(
    //     `Created on: ${convertToHumanReadableDate(certificate.certificateSummary.certificateIssueDate)}`,
    //   );
    //   await expect(clientName).toBeVisible();
    //   await expect(referenceNumber).toBeVisible();
    //   await expect(createdOn).toBeVisible();

    //   const resendCertificateButton = page.getByRole("button", {
    //     name: "Resend certificate",
    //   });
    //   await expect(resendCertificateButton).toBeVisible();

    //   const overviewHeading = page.getByRole("heading", { name: "Overview" });
    //   const scopeHeading = page.getByRole("heading", { name: "Scope" });
    //   await expect(overviewHeading).toBeVisible();
    //   await expect(scopeHeading).toBeVisible();
    // });
    // test("should display correct insert text", async ({ page }) => {
    //   const applicationId = testDataFactory.laaRefToAppId("L-000-001");
    //   await page.goto(`/applications/${applicationId}/certificate`);

    //   const certificateInfoInsertText = page.getByText(
    //     "This is to certify that the status of the certificate is as specified in the Certificate summary. Its scope is specified in the proceedings listed and is subject to the limitations and conditions.",
    //   );
    //   await expect(certificateInfoInsertText).toBeVisible();

    //   const certificateLimitationsInsertText = page.getByText(
    //     "This certificate imposes both scope and financially implications on the work to be done under it. Providers should check the limitations imposed carefully and apply for an amendment where appropriate.",
    //   );
    //   await expect(certificateLimitationsInsertText).toBeVisible();

    //   const scopeInsertText = page.getByText(
    //     "Payment will not be made for work undertaken outside the scope specified or in excess of the cost limit.",
    //   );
    //   await expect(scopeInsertText).toBeVisible();
    // });
  });
  //   test.describe("Certificate Details Table", () => {
  //     test("certificate details table should be visible", async ({ page }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);

  //       const certificateOverviewTable = page.getByText("Certificate details");
  //       await expect(certificateOverviewTable).toBeVisible();
  //     });
  //     test("should display correct data inside the certificate details table", async ({
  //       page,
  //     }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);

  //       const certificate =
  //         testDataFactory.selectCertificateByApplicationId(applicationId);

  //       const expectedTableValues = [
  //         "Applicant name",
  //         `${certificate.client.firstName} ${certificate.client.lastName}`,
  //         "Applicant address",
  //         certificate.client.homeAddress ?? "",
  //         "Firm name",
  //         "",
  //         "Office address",
  //         "",
  //         "Opponent details",
  //         getOpponentName(certificate.opponents[0]),
  //         "Guardian name",
  //         "Not provided",
  //         "Guardian address",
  //         "Not provided",
  //       ];

  //       await checkSummaryListTableValues(
  //         "certificate-details-table",
  //         page,
  //         expectedTableValues,
  //         "Certificate details",
  //       );
  //     });
  //     test("should correctly display when multiple opponents are present", async ({
  //       page,
  //     }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);

  //       const certificate =
  //         testDataFactory.selectCertificateByApplicationId(applicationId);

  //       const table = page.locator(
  //         `.certificate-details-table .govuk-summary-card`,
  //         {
  //           hasText: "Certificate Details",
  //         },
  //       );
  //       const summaryRow = table.locator(".govuk-summary-list__row", {
  //         hasText: "Opponent Details",
  //       });

  //       await expect(
  //         summaryRow.locator(".govuk-summary-list__key", {
  //           hasText: "Opponent Details",
  //         }),
  //       ).toBeVisible();
  //       await expect(
  //         summaryRow.locator(".govuk-summary-list__value", {
  //           hasText: getOpponentName(certificate.opponents[0]),
  //         }),
  //       ).toBeVisible();
  //       await expect(
  //         summaryRow.locator(".govuk-summary-list__value", {
  //           hasText: getOpponentName(certificate.opponents[1]),
  //         }),
  //       ).toBeVisible();
  //     });
  //   });
  //   test.describe("Certificate Summary Table", () => {
  //     test("certificate summary table should be visible", async ({ page }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);

  //       const certificateSummaryTable = page.getByRole("heading", {
  //         name: "Certificate summary",
  //       });

  //       await expect(certificateSummaryTable).toBeVisible();
  //     });
  //     test("should display correct inside the certificate summary table", async ({
  //       page,
  //     }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);

  //       const certificate =
  //         testDataFactory.selectCertificateByApplicationId(applicationId);

  //       const expectedTableValues = [
  //         "Certificate type",
  //         applicationEnumMap[certificate.certificateSummary.certificateType],
  //         "Status",
  //         applicationEnumMap[
  //           certificate.certificateSummary.certificateStatusCode
  //         ],
  //         "Effective date",
  //         convertToHumanReadableDate(certificate.certificateSummary.startDate),
  //         "End date",
  //         certificate.certificateSummary.endDate === null
  //           ? "Not Applicable"
  //           : convertToHumanReadableDate(certificate.certificateSummary.endDate),
  //         "Reinstatement date",
  //         certificate.certificateSummary.reinstatementDate === null
  //           ? "Not Applicable"
  //           : convertToHumanReadableDate(
  //               certificate.certificateSummary.reinstatementDate,
  //             ),
  //         "Cost limitation",
  //         convertNumberToCurrency(
  //           certificate.proceedings[0].substantiveCostLimitation,
  //         ),
  //         "Cost limitation effective date",
  //         convertToHumanReadableDate(
  //           certificate.certificateSummary.costLimitEffectiveDate,
  //         ),
  //         "Certificate limitation",
  //         certificate.certificateSummary.certificateLimitationDate === null
  //           ? "Not Applicable"
  //           : convertToHumanReadableDate(
  //               certificate.certificateSummary.certificateLimitationDate,
  //             ),
  //       ];

  //       await checkSummaryListTableValues(
  //         "certificate-summary-table",
  //         page,
  //         expectedTableValues,
  //         "Certificate summary",
  //       );
  //     });
  //   });
  //   test.describe("Proceedings Tables", () => {
  //     test("proceeding tables should be visible", async ({ page }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);
  //       const certificate =
  //         testDataFactory.selectCertificateByApplicationId(applicationId);
  //       const expectedProceedings = certificate.proceedings;

  //       for (let index = 0; index < expectedProceedings.length; index++) {
  //         const proceedingTable = page.getByText(
  //           `${(index + 1).toString()}. ${
  //             applicationEnumMap[expectedProceedings[index].proceedingType]
  //           }`,
  //         );
  //         await expect(proceedingTable).toBeVisible();
  //       }
  //     });
  //     test("should display correct data inside each of the proceeding tables", async ({
  //       page,
  //     }) => {
  //       const applicationId = testDataFactory.laaRefToAppId("L-000-001");
  //       await page.goto(`/applications/${applicationId}/certificate`);
  //       const certificate =
  //         testDataFactory.selectCertificateByApplicationId(applicationId);
  //       const expectedProceedings = certificate.proceedings;

  //       for (let index = 0; index < expectedProceedings.length; index++) {
  //         const expectedProceeding = expectedProceedings[index];
  //         const expectedTableValues = [
  //           "Category of law",
  //           applicationEnumMap[expectedProceeding.categoryOfLaw],
  //           "Current status",
  //           applicationEnumMap[expectedProceeding.meritsDecision],
  //           "Date work can be commenced on the above proceeding",
  //           convertToHumanReadableDate(expectedProceeding.delegatedFunctionsDate),
  //           "Proceeding end date",
  //           convertToHumanReadableDate(
  //             expectedProceeding.proceedingEndDate ?? "",
  //           ),
  //           "Applicant involvement type",
  //           applicationEnumMap[expectedProceeding.clientInvolvementType],
  //           "Level of service",
  //           applicationEnumMap[expectedProceeding.levelOfService],
  //           "Date current form of service effective",
  //           convertToHumanReadableDate(
  //             expectedProceeding.levelOfServiceEffectiveDate,
  //           ),
  //           "Previous form of service",
  //           "Not Applicable",
  //           "Date previous level of service effective",
  //           "Not Applicable",
  //           "Limitation",
  //           applicationEnumMap[
  //             expectedProceeding.scopeLimitations[0].scopeLimitation
  //           ],
  //           "Effective date",
  //           convertToHumanReadableDate(
  //             expectedProceeding.limitationEffectiveDate,
  //           ),
  //           "End date",
  //           convertToHumanReadableDate(
  //             expectedProceeding.proceedingEndDate ?? "",
  //           ),
  //         ];

  //         await checkSummaryListTableValues(
  //           `certificate-proceeding-${(index + 1).toString()}`,
  //           page,
  //           expectedTableValues,
  //           `${(index + 1).toString()}. ${
  //             applicationEnumMap[expectedProceeding.proceedingType]
  //           }`,
  //         );
  //       }
  //     });
  //   });
});
