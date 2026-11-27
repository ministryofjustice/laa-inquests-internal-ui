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
    });

    it("returns a tooLong error for notes far exceeding the limit", () => {
      const form: AddHistoryNoteForm = { "note-text": "a".repeat(10500) };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepInclude(result.errors, {
        noteText: { text: historyLocale.validationErrors.tooLong },
      });
    });

    it("returns no errors when the note is exactly 10,000 characters", () => {
      const form: AddHistoryNoteForm = { "note-text": "a".repeat(10000) };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
    });

    it("returns no errors when the note contains valid text", () => {
      const form: AddHistoryNoteForm = {
        "note-text": "This is a valid case note.",
      };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
    });

    it("returns no errors when the note contains special characters", () => {
      const form: AddHistoryNoteForm = {
        "note-text": "Note with £, @, #, &, (brackets) and 'quotes'!",
      };

      const result = validator.validateAddHistoryNoteForm(form);

      assert.deepEqual(result.errors, {});
    });

    [
      ["a less-than sign", "cost < estimate"],
      ["a greater-than sign", "cost > estimate"],
      ["HTML", '<b>bold</b> & "quoted" <em>text</em>'],
      ["a script tag", "<script>alert(1)</script>"],
      ["a control character", "bell\u0007"],
      ["a null byte", "null\u0000byte"],
      ["a zero-width character", "zero\u200bwidth"],
      ["a right-to-left override", "\u202etxt.exe"],
    ].forEach(([reason, value]) => {
      it(`returns an invalidCharacters error when the note contains ${reason}`, () => {
        const result = validator.validateAddHistoryNoteForm({
          "note-text": value,
        });

        assert.deepEqual(result.errors, {
          noteText: { text: historyLocale.validationErrors.invalidCharacters },
        });
      });
    });

    it("returns a tooLong error before an invalidCharacters error", () => {
      const result = validator.validateAddHistoryNoteForm({
        "note-text": `<${"a".repeat(10000)}`,
      });

      assert.deepEqual(result.errors, {
        noteText: { text: historyLocale.validationErrors.tooLong },
      });
    });

    [
      "Line one\nline two\n\nline four",
      "Line one\r\nline two",
      "Column\tone",
      'Spoke to the provider; =+@ 100% £5 #2 (see s.1(a) & (b)): "ok"',
      "Zoë 李明 O\u2019Brien",
    ].forEach((value) => {
      it(`returns no errors for the note ${JSON.stringify(value.slice(0, 40))}`, () => {
        const result = validator.validateAddHistoryNoteForm({
          "note-text": value,
        });

        assert.deepEqual(result.errors, {});
      });
    });
  });
});
