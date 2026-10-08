import { TypedRequestBody } from "#src/infrastructure/express/api.types.js";
import { SearchClaimReferenceErrors } from "../../models/form.types.js";
import type { SearchClaimValidator } from "./SearchClaim.validator.js";
import type { Request, Response } from "express";

interface SearchClaimReferenceForm {
  "claim-reference": string;
}

export class SearchClaimAdaptor {
  constructor(private readonly validator: SearchClaimValidator) {}

  renderSearchClaimPage(request: Request, response: Response, errors : Partial<SearchClaimReferenceErrors> = {}): void {
    response.render("application/claims/search/index", errors);
  }

  processSearchClaimPage(request: TypedRequestBody<SearchClaimReferenceForm>, response: Response): void {
    const { body: { "claim-reference": reference } } = request;

    const errors = this.validator.validateSearchClaimForm(reference);
    if (Object.keys(errors).length > 0) {
      this.renderSearchClaimPage(request as Request, response, errors);
      return;
    }

    response.redirect(`/`);
  }
}
