import { strict as assert } from "assert";
import { JSDOM } from "jsdom";
import { initialiseApplicationOverviewNoteErrors } from "#src/infrastructure/build/applicationOverviewNoteErrors.js";

describe("application overview note errors", () => {
  it("clears note errors when leaving History without discarding the draft or other descriptions", () => {
    const dom = new JSDOM(
      `
        <div id="history-note-error-summary" class="govuk-error-summary"></div>
        <div id="application-overview-tabs">
          <a class="govuk-tabs__tab" href="#history">History</a>
          <a class="govuk-tabs__tab" href="#people">People</a>
          <div id="history">
            <form>
              <div class="govuk-form-group govuk-form-group--error">
                <p id="note-text-hint">Note hint</p>
                <p id="note-text-error" class="govuk-error-message">Enter a note</p>
                <textarea id="note-text" class="govuk-textarea govuk-textarea--error"
                  aria-describedby="note-text-hint note-text-error note-text-info">Draft note</textarea>
                <p id="note-text-info">Character count</p>
              </div>
            </form>
          </div>
          <div id="people"></div>
        </div>
      `,
      { url: "https://example.test/applications/1/overview#history" },
    );

    try {
      const { document } = dom.window;
      initialiseApplicationOverviewNoteErrors(document, dom.window);

      dom.window.history.pushState(null, "", "#people");
      dom.window.dispatchEvent(new dom.window.HashChangeEvent("hashchange"));

      const noteTextarea =
        document.querySelector<HTMLTextAreaElement>("#note-text");
      assert.ok(noteTextarea);
      assert.equal(document.querySelector(".govuk-error-summary"), null);
      assert.equal(document.querySelector("#note-text-error"), null);
      assert.equal(document.querySelector(".govuk-form-group--error"), null);
      assert.equal(
        noteTextarea.classList.contains("govuk-textarea--error"),
        false,
      );
      assert.equal(noteTextarea.value, "Draft note");
      assert.equal(
        noteTextarea.getAttribute("aria-describedby"),
        "note-text-hint note-text-info",
      );
      assert.ok(document.querySelector("#note-text-hint"));
      assert.ok(document.querySelector("#note-text-info"));
    } finally {
      dom.window.close();
    }
  });

  it("clears only the note success banner after leaving History", () => {
    const dom = new JSDOM(
      `
        <div id="history-note-success-banner" class="govuk-notification-banner--success">Note added</div>
        <div id="public-authority-success-banner" class="govuk-notification-banner--success">Authorities updated</div>
        <div id="application-overview-tabs">
          <a class="govuk-tabs__tab" href="#history">History</a>
          <a class="govuk-tabs__tab" href="#people">People</a>
          <div id="history">
            <textarea id="note-text" aria-describedby="note-text-hint note-text-info">Another draft</textarea>
          </div>
          <div id="people"></div>
        </div>
      `,
      { url: "https://example.test/applications/1/overview" },
    );

    try {
      const { document } = dom.window;
      initialiseApplicationOverviewNoteErrors(document, dom.window);

      dom.window.history.pushState(null, "", "#history");
      dom.window.dispatchEvent(new dom.window.HashChangeEvent("hashchange"));
      assert.ok(document.getElementById("history-note-success-banner"));

      dom.window.history.pushState(null, "", "#people");
      dom.window.dispatchEvent(new dom.window.HashChangeEvent("hashchange"));

      assert.equal(
        document.getElementById("history-note-success-banner"),
        null,
      );
      assert.equal(
        document.getElementById("public-authority-success-banner")?.textContent,
        "Authorities updated",
      );
      const noteTextarea =
        document.querySelector<HTMLTextAreaElement>("#note-text");
      assert.ok(noteTextarea);
      assert.equal(noteTextarea.value, "Another draft");
      assert.equal(
        noteTextarea.getAttribute("aria-describedby"),
        "note-text-hint note-text-info",
      );
    } finally {
      dom.window.close();
    }
  });

  it("keeps note errors while staying on History", () => {
    const dom = new JSDOM(
      `
        <div id="history-note-error-summary">Enter a note</div>
        <div id="application-overview-tabs">
          <a class="govuk-tabs__tab" href="#history">History</a>
          <div id="history">
            <div class="govuk-form-group govuk-form-group--error">
              <p id="note-text-error">Enter a note</p>
              <textarea id="note-text" class="govuk-textarea govuk-textarea--error"
                aria-describedby="note-text-error"></textarea>
            </div>
          </div>
        </div>
      `,
      { url: "https://example.test/applications/1/overview" },
    );

    try {
      const { document } = dom.window;
      initialiseApplicationOverviewNoteErrors(document, dom.window);

      for (const destinationHash of ["#history", "#note-text"]) {
        const oldURL = dom.window.location.href;
        dom.window.history.pushState(null, "", destinationHash);
        dom.window.dispatchEvent(
          new dom.window.HashChangeEvent("hashchange", {
            oldURL,
            newURL: dom.window.location.href,
          }),
        );

        assert.equal(
          document.getElementById("history-note-error-summary")?.textContent,
          "Enter a note",
        );
        assert.equal(
          document.getElementById("note-text-error")?.textContent,
          "Enter a note",
        );
        assert.ok(document.querySelector(".govuk-form-group--error"));
        assert.ok(document.querySelector(".govuk-textarea--error"));
        assert.equal(
          document
            .getElementById("note-text")
            ?.getAttribute("aria-describedby"),
          "note-text-error",
        );
      }
    } finally {
      dom.window.close();
    }
  });
});
