import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { continueToNextPage } from "../../utils/govuk-validators.js";
import {
  FAILED_GRANT_DECISION_REFERENCE,
  FAILED_REFUSE_DECISION_REFERENCE,
} from "#tests/playwright/factories/handlers/decisionErrors.js";

const meritsLocale = en.pages.decision.merits;
const justificationLocale = en.pages.decision.justification;
const certificateStartDateLocale = en.pages.decision.certificateStartDate;
const confirmationLocale = en.pages.decision.confirmation;
const internalServerError = en.pages.error.internalServerError;

test.describe("Decision errors", () => {
  test("shows the generic error page when granting an application fails", async ({
    page,
  }) => {
    const decisionPage = `/applications/${FAILED_GRANT_DECISION_REFERENCE}/decision`;
    await page.goto(decisionPage);

    const decisionForm = page.getByTestId("make-a-decision");
    await decisionForm
      .getByRole("radio", { name: meritsLocale.radio.grantLabel })
      .check();
    await continueToNextPage(decisionForm, page);

    const certificateForm = page.getByTestId("certificate-start-date");
    await certificateForm.getByRole("radio", { name: "Today" }).check();
    await continueToNextPage(certificateForm, page);

    const confirmationForm = page.getByTestId("check-your-answers");
    await confirmationForm
      .getByRole("button", { name: confirmationLocale.submitButton })
      .click();

    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(page.getByText(internalServerError)).toBeVisible();
  });

  test("shows the generic error page when refusing an application fails", async ({
    page,
  }) => {
    const decisionPage = `/applications/${FAILED_REFUSE_DECISION_REFERENCE}/decision`;
    await page.goto(decisionPage);

    const decisionForm = page.getByTestId("make-a-decision");
    await decisionForm
      .getByRole("radio", { name: meritsLocale.radio.refuseLabel })
      .check();
    await continueToNextPage(decisionForm, page);

    const justificationForm = page.getByTestId("select-reason-for-refusal");
    await justificationForm
      .getByRole("radio", {
        name: justificationLocale.radio.insufficientInformation,
      })
      .check();
    await justificationForm
      .getByLabel(justificationLocale.textarea.label)
      .fill("The application does not meet the required merits threshold.");
    await continueToNextPage(justificationForm, page);

    const confirmationForm = page.getByTestId("check-your-answers");
    await confirmationForm
      .getByRole("button", { name: confirmationLocale.submitButton })
      .click();

    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(page.getByText(internalServerError)).toBeVisible();
  });
});
