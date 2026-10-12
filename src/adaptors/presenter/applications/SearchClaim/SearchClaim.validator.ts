import { FormValidator } from "#src/utils/FormValidator.js";
import type { SearchClaimReferenceErrors } from "../../models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

export class SearchClaimValidator extends FormValidator {
  validateSearchClaimForm(
    reference: string | null,
  ): Partial<SearchClaimReferenceErrors> {
    if (reference === null || reference === "") {
      return {
        claimReference: {
          text: en.pages.claimSearch.error.required,
        },
      };
    }

    const validReferenceRegex = /^INQC-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/v;
    if (!validReferenceRegex.test(reference)) {
      return {
        claimReference: {
          text: en.pages.claimSearch.error.format,
        },
      };
    }

    return {};
  }
}
