import { assert } from "chai";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { AddHistoryNoteValidator } from "#src/adaptors/presenter/applications/AddHistoryNote.validator.js";
import type { AddHistoryNoteForm } from "#src/adaptors/presenter/models/form.types.js";

describe("AddHistoryNoteValidator", () => {
  const validator = new AddHistoryNoteValidator();
  const historyLocale = en.pages.applicationOverview.history;

  describe("validateAddHistoryNoteForm", () => {
    it("returns an empty error when the note is empty", () => {
      const form: AddHistoryNoteForm = { "note-text": "" };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepInclude(result.errors, {
        noteText: { text: historyLocale.validationErrors.empty },
      });
    });

    it("returns an empty error when the note contains only spaces", () => {
      const form: AddHistoryNoteForm = { "note-text": "   " };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepInclude(result.errors, {
        noteText: { text: historyLocale.validationErrors.empty },
      });
    });

    it("returns an empty error when the note contains only tabs and newlines", () => {
      const form: AddHistoryNoteForm = { "note-text": "\t\n\r " };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepInclude(result.errors, {
        noteText: { text: historyLocale.validationErrors.empty },
      });
    });

    it("returns a tooLong error when the note exceeds 10,000 characters", () => {
      const form: AddHistoryNoteForm = { "note-text": "a".repeat(10001) };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepInclude(result.errors, {
        noteText: { text: historyLocale.validationErrors.tooLong },
      });
      assert.equal(result.excessCount, 1);
    });

    it("returns the correct excess count for notes far exceeding the limit", () => {
      const form: AddHistoryNoteForm = { "note-text": "a".repeat(10500) };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.equal(result.excessCount, 500);
    });

    it("returns no errors when the note is exactly 10,000 characters", () => {
      const form: AddHistoryNoteForm = { "note-text": "a".repeat(10000) };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
      assert.isUndefined(result.excessCount);
    });

    it("returns no errors when the note contains valid text", () => {
      const form: AddHistoryNoteForm = {
        "note-text": "This is a valid case note.",
      };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
      assert.isUndefined(result.excessCount);
    });

    it("returns no errors when the note contains special characters", () => {
      const form: AddHistoryNoteForm = {
        "note-text": "Note with £, @, #, &, <brackets> and 'quotes'!",
      };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
    });
  });
});
