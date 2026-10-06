import type { TypedRequestBody } from "#src/infrastructure/express/api.types.js";
import type { Request, Response } from "express";
import type { SearchApplicationReferenceErrors } from "../models/form.types.js";
import type { SearchApplicationValidator } from "./SearchApplication.validator.js";

interface SearchApplicationReferenceForm {
  "application-reference": string;
}

export class SearchApplicationAdaptor {
  constructor(private readonly validator: SearchApplicationValidator) {}

  renderSearchApplicationPage(
    req: Request,
    res: Response,
    errors: Partial<SearchApplicationReferenceErrors> = {},
  ): void {
    res.render("application/search", errors);
  }

  processSearchApplicationPage(
    req: TypedRequestBody<SearchApplicationReferenceForm>,
    res: Response,
  ): void {
    const {
      body: { "application-reference": reference },
    } = req;

    const errors = this.validator.validateSearchApplicationForm(reference);
    if (Object.keys(errors).length > 0) {
      this.renderSearchApplicationPage(req as Request, res, errors);
      return;
    }

    res.redirect(`/applications/${reference}/overview`);
  }
}
