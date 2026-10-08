import { SearchClaimValidator } from "./SearchClaim.validator.js";
import type { Request, Response } from "express";

export class SearchClaimAdaptor {

    constructor(private readonly validator: SearchClaimValidator) {}

    renderSearchClaimPage(request: Request, response: Response): void {
        response.render("claim/search");
    }


}