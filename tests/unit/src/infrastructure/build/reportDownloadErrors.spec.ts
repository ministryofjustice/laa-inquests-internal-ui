import { strict as assert } from "assert";
import { JSDOM } from "jsdom";
import { initialiseReportDownloadErrors } from "#src/infrastructure/build/reportDownloadErrors.js";

const errorMarkup = `
  <div class="govuk-error-summary">There is a problem</div>
  <form data-report-download-form>
    <div class="govuk-form-group govuk-form-group--error">
      <fieldset aria-describedby="start-date-hint start-date-error">
        <p id="start-date-hint">For example, 12 12 2026</p>
        <p id="start-date-error" class="govuk-error-message">Enter a start date</p>
        <input id="start-date-day" class="govuk-input govuk-input--error" value="99">
      </fieldset>
    </div>
    <div class="govuk-form-group govuk-form-group--error">
      <fieldset aria-describedby="end-date-error">
        <p id="end-date-error" class="govuk-error-message">Enter an end date</p>
        <input id="end-date-day" class="govuk-input govuk-input--error">
      </fieldset>
    </div>
    <button type="submit">Download report</button>
  </form>
`;

describe("report download errors", () => {
  const submit = (dom: JSDOM): void => {
    dom.window.document
      .querySelector("form")
      ?.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  };

  it("keeps the errors until the form is submitted", () => {
    const dom = new JSDOM(errorMarkup);
    try {
      initialiseReportDownloadErrors(dom.window.document);

      assert.ok(dom.window.document.querySelector(".govuk-error-summary"));
      assert.equal(
        dom.window.document.querySelectorAll(".govuk-error-message").length,
        2,
      );
    } finally {
      dom.window.close();
    }
  });

  it("clears the errors and keeps the entered values when the form is submitted", () => {
    const dom = new JSDOM(errorMarkup);
    try {
      const { document } = dom.window;
      initialiseReportDownloadErrors(document);
      submit(dom);

      assert.equal(document.querySelector(".govuk-error-summary"), null);
      assert.equal(document.querySelectorAll(".govuk-error-message").length, 0);
      assert.equal(
        document.querySelectorAll(".govuk-form-group--error").length,
        0,
      );
      assert.equal(document.querySelectorAll(".govuk-input--error").length, 0);
      assert.equal(
        document.querySelector("fieldset")?.getAttribute("aria-describedby"),
        "start-date-hint",
      );
      assert.equal(
        document
          .querySelectorAll("fieldset")[1]
          ?.hasAttribute("aria-describedby"),
        false,
      );
      assert.equal(
        document.querySelector<HTMLInputElement>("#start-date-day")?.value,
        "99",
      );
    } finally {
      dom.window.close();
    }
  });

  it("does nothing when the page has no report download form", () => {
    const dom = new JSDOM(
      '<div class="govuk-error-summary"></div><form></form>',
    );
    try {
      initialiseReportDownloadErrors(dom.window.document);
      submit(dom);

      assert.ok(dom.window.document.querySelector(".govuk-error-summary"));
    } finally {
      dom.window.close();
    }
  });
});
