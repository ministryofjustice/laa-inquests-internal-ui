import { strict as assert } from "assert";
import { JSDOM } from "jsdom";
import sinon from "sinon";
import { initialiseReportDownloadErrors } from "#src/infrastructure/build/reportDownloadErrors.js";

const TOKEN = "11111111-2222-3333-4444-555555555555";

const errorMarkup = `
  <div class="govuk-error-summary">There is a problem</div>
  <form data-report-download-form>
    <input type="hidden" name="download-token" value="">
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
  let clock: sinon.SinonFakeTimers;
  let dom: JSDOM;

  beforeEach(() => {
    clock = sinon.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "Date"],
    });
    dom = new JSDOM(errorMarkup, { url: "https://example.test/reports/x" });
    sinon.stub(dom.window.crypto, "randomUUID").returns(TOKEN);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
    dom.window.close();
  });

  const pageWindow = (): Parameters<
    typeof initialiseReportDownloadErrors
  >[1] => ({
    crypto: dom.window.crypto,
    setInterval: ((handler: () => void, ms: number) =>
      setInterval(handler, ms)) as unknown as Window["setInterval"],
    clearInterval: ((id: number) =>
      clearInterval(id)) as unknown as Window["clearInterval"],
  });

  const submit = (): void => {
    const form = dom.window.document.querySelector("form");
    assert.ok(form);
    form.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  };

  it("keeps the errors while no download has completed", () => {
    initialiseReportDownloadErrors(dom.window.document, pageWindow());
    submit();
    clock.tick(5000);

    assert.ok(dom.window.document.querySelector(".govuk-error-summary"));
    assert.equal(
      dom.window.document.querySelectorAll(".govuk-error-message").length,
      2,
    );
  });

  it("puts a token in the form when it is submitted", () => {
    initialiseReportDownloadErrors(dom.window.document, pageWindow());
    submit();

    const tokenInput = dom.window.document.querySelector<HTMLInputElement>(
      'input[name="download-token"]',
    );
    assert.equal(tokenInput?.value, TOKEN);
  });

  it("clears the errors and keeps the entered values once the matching cookie appears", () => {
    initialiseReportDownloadErrors(dom.window.document, pageWindow());
    submit();
    dom.window.document.cookie = `reportDownloadToken=${TOKEN}; path=/`;
    clock.tick(500);

    const { document } = dom.window;
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
    assert.ok(!document.cookie.includes("reportDownloadToken="));
  });

  it("ignores a cookie left by a different download", () => {
    initialiseReportDownloadErrors(dom.window.document, pageWindow());
    submit();
    dom.window.document.cookie = "reportDownloadToken=other-token; path=/";
    clock.tick(5000);

    assert.ok(dom.window.document.querySelector(".govuk-error-summary"));
  });

  it("stops watching for the cookie after the timeout", () => {
    initialiseReportDownloadErrors(dom.window.document, pageWindow());
    submit();
    clock.tick(61_000);
    dom.window.document.cookie = `reportDownloadToken=${TOKEN}; path=/`;
    clock.tick(5000);

    assert.ok(dom.window.document.querySelector(".govuk-error-summary"));
  });

  it("does nothing when the page has no report download form", () => {
    const other = new JSDOM("<form></form>");
    try {
      initialiseReportDownloadErrors(other.window.document, pageWindow());
      other.window.document
        .querySelector("form")
        ?.dispatchEvent(new other.window.Event("submit"));
    } finally {
      other.window.close();
    }
  });
});
