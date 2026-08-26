import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";

export interface PublicAuthorityError {
  noPublicAuthoritySelected?: { text: string };
  noChangeToPublicAuthorities?: { text: string };
}

export interface PublicAuthorityFormData {
  publicAuthorityOption?: string | string[];
}

export class PublicAuthorityValidator extends FormValidator {
  validatePublicAuthorityInput(
    formBody: Partial<PublicAuthorityFormData>,
    currentPublicBodyIds: string[] = [],
  ): Partial<PublicAuthorityError> {
    const errorSummaries: Partial<PublicAuthorityError> = {};

    const { publicAuthorityOption } = formBody;

    const selectedOptions = Array.isArray(publicAuthorityOption)
      ? publicAuthorityOption.filter((option) => option !== "")
      : typeof publicAuthorityOption === "string" &&
          publicAuthorityOption !== ""
        ? [publicAuthorityOption]
        : [];

    if (selectedOptions.length === EMPTY_ARR_LENGTH) {
      errorSummaries.noPublicAuthoritySelected = {
        text: en.pages.applicationOverview.publicAuthority.validationError
          .notEmpty,
      };
    } else if (this.#isUnchanged(selectedOptions, currentPublicBodyIds)) {
      errorSummaries.noChangeToPublicAuthorities = {
        text: en.pages.applicationOverview.publicAuthority.validationError
          .noChange,
      };
    }

    return errorSummaries;
  }

  #isUnchanged(
    selectedOptions: string[],
    currentPublicBodyIds: string[],
  ): boolean {
    if (selectedOptions.length !== currentPublicBodyIds.length) {
      return false;
    }

    const sortedSelected = [...selectedOptions].sort();
    const sortedCurrent = [...currentPublicBodyIds].sort();

    return sortedSelected.every(
      (option, index) => option === sortedCurrent[index],
    );
  }
}
