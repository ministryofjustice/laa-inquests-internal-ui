import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface PublicAuthorityForm {
  publicAuthorityOption?: string | string[];
}

export interface PublicAuthorityFormErrors {
  noPublicAuthoritySelected?: FormErrorMessage;
}
