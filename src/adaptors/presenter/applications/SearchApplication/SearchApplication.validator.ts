import { FormValidator } from "#src/utils/FormValidator.js";
import type { SearchApplicationReferenceErrors } from "../../models/form.types.js";

export class SearchApplicationValidator extends FormValidator {
  validateSearchApplicationForm(
    reference: string | null,
  ): Partial<SearchApplicationReferenceErrors> {
    if (reference === null || reference === "") {
      return {
        applicationReference: {
          text: "Enter a legal aid reference",
        },
      };
    }

    /* eslint-disable-next-line require-unicode-regexp -- not expected to have unicode in filenames */
    const validReferenceRegex = /^INQ-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/;
    if (!validReferenceRegex.test(reference)) {
      return {
        applicationReference: {
          text: "Enter a legal aid reference number in the correct format",
        },
      };
    }

    return {};
  }
}
