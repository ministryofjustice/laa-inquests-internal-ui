import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface PublicBodyForm {
  publicBodyOption?: string | string[];
}

export interface PublicBodyFormErrors {
  noPublicBodySelected?: FormErrorMessage;
}
