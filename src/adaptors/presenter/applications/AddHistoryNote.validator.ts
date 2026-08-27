import type {
  AddHistoryNoteForm,
  AddHistoryNoteValidationResult,
} from "#src/adaptors/presenter/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import { NOTE_MAX_CHARACTER_LENGTH } from "#src/infrastructure/locales/constants.js";

const { pages } = en;
const {
  applicationOverview: {
    history: { validationErrors },
  },
} = pages;

export class AddHistoryNoteValidator extends FormValidator {
  validateAddHistoryNoteForm(
    form: AddHistoryNoteForm,
  ): AddHistoryNoteValidationResult {
    const result: AddHistoryNoteValidationResult = { errors: {} };
    const { "note-text": noteText } = form;

    if (!noteText.trim()) {
      result.errors.noteText = {
        text: validationErrors.empty,
      };
      return result;
    }

    if (this.exceedsMaxLength(noteText, NOTE_MAX_CHARACTER_LENGTH)) {
      result.errors.noteText = {
        text: validationErrors.tooLong,
      };
      result.excessCount = noteText.length - NOTE_MAX_CHARACTER_LENGTH;
    }

    return result;
  }
}
