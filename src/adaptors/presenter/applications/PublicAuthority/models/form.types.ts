import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface PublicAuthorityForm {
  publicAuthorityOption?: string | string[];
  currentPublicBodyIds?: string[];
}

export interface PublicAuthorityFormErrors {
  noPublicAuthoritySelected?: FormErrorMessage;
  noChangeToPublicAuthorities?: FormErrorMessage;
}
