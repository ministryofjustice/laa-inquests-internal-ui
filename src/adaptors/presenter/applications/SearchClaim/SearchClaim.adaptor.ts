import type { TypedRequestBody } from "#src/infrastructure/express/api.types.js";
import { HTTP_NOT_FOUND } from "#src/infrastructure/express/constants.js";
import type { RetrieveApplicationReferenceUseCase } from "#src/use-cases/applications/claims/RetrieveApplicationReference.useCase.js";
import type { SearchClaimReferenceErrors } from "../../models/form.types.js";
import type { SearchClaimValidator } from "./SearchClaim.validator.js";
import type { Request, Response } from "express";

interface SearchClaimReferenceForm {
  "claim-reference": string;
}

export class SearchClaimAdaptor {
  constructor(
    private readonly validator: SearchClaimValidator,
    private readonly retrieveApplicationReferenceUseCase: RetrieveApplicationReferenceUseCase,
  ) {}

  renderSearchClaimPage(
    request: Request,
    response: Response,
    errors: Partial<SearchClaimReferenceErrors> = {},
  ): void {
    response.render("application/claims/search/index", errors);
  }

  async processSearchClaimPage(
    request: TypedRequestBody<SearchClaimReferenceForm>,
    response: Response,
  ): Promise<void> {
    const {
      body: { "claim-reference": reference },
    } = request;

    const errors = this.validator.validateSearchClaimForm(reference);
    if (Object.keys(errors).length > 0) {
      this.renderSearchClaimPage(request as Request, response, errors);
      return;
    }

    const result = await this.retrieveApplicationReferenceUseCase.execute({
      claimReference: reference,
      accessToken: request.session.user?.accessToken,
    });

    if (result.status === "NOT_FOUND") {
      response.status(HTTP_NOT_FOUND).render("application/claims/not-found");
      return;
    }

    response.redirect(`/applications/${result.laaReference}/overview`);
  }
}
