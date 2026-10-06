import type { TypedRequestBody } from "#src/infrastructure/express/api.types.js";
import type { Request, Response } from "express";

interface SearchApplicationReferenceForm {
  "application-reference": string;
}

export class SearchApplicationAdaptor {
  renderSearchApplicationPage(req: Request, res: Response): void {
    res.render("application/search");
  }

  processSearchApplicationPage(
    req: TypedRequestBody<SearchApplicationReferenceForm>,
    res: Response,
  ): void {
    const {
      body: { "application-reference": reference },
    } = req;

    res.redirect(`/applications/${reference}/overview`);
  }
}
