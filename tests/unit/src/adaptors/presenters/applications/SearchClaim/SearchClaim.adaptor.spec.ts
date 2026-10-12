import {
  StubbedInstance,
  stubInterface,
} from "#node_modules/ts-sinon/dist/index.js";
import { SearchClaimAdaptor } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.adaptor.js";
import { SearchClaimValidator } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.validator.js";
import type { RetrieveApplicationReferenceUseCase } from "#src/use-cases/applications/claims/RetrieveApplicationReference.useCase.js";
import type { Request, Response } from "express";
import { strict as assert } from "assert";
import { stub } from "sinon";

describe("SearchClaimAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let validatorStub: StubbedInstance<SearchClaimValidator>;
  let searchClaimAdaptor: SearchClaimAdaptor;
  let retrieveApplicationReferenceUseCaseStub: StubbedInstance<RetrieveApplicationReferenceUseCase>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    validatorStub = stubInterface<SearchClaimValidator>();
    validatorStub.validateSearchClaimForm.returns({});
    retrieveApplicationReferenceUseCaseStub =
      stubInterface<RetrieveApplicationReferenceUseCase>();
    searchClaimAdaptor = new SearchClaimAdaptor(
      validatorStub,
      retrieveApplicationReferenceUseCaseStub,
    );
  });

  describe("renderSearchClaimPage", () => {
    it("should render the search claim page", () => {
      searchClaimAdaptor.renderSearchClaimPage(requestStub, responseStub);
      assert.equal(responseStub.render.calledOnce, true);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/claims/search/index");
    });

    it("passes errors object into res.render", () => {
      const errors = {
        claimReference: {
          text: "Example error",
        },
      };
      searchClaimAdaptor.renderSearchClaimPage(
        requestStub,
        responseStub,
        errors,
      );
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[1], errors);
    });
  });

  describe("processSearchClaimPage", () => {
    beforeEach(() => {
      requestStub.body = { "claim-reference": "INQC-ELTH-NV70" };
    });

    it("redirects to the application overview for the claim", async () => {
      const laaReference = "INQ-WAU-X9A";

      retrieveApplicationReferenceUseCaseStub.execute.resolves({
        status: "SUCCESS",
        laaReference,
      });

      await searchClaimAdaptor.processSearchClaimPage(
        requestStub,
        responseStub,
      );

      assert.equal(
        responseStub.redirect.firstCall.args[0],
        `/applications/${laaReference}/overview`,
      );
    });

    it("calls renderSearchClaimPage with expected errors", () => {
      const errors = {
        claimReference: {
          text: "Example error",
        },
      };
      validatorStub.validateSearchClaimForm.returns(errors);

      const renderStub = stub(searchClaimAdaptor, "renderSearchClaimPage");

      searchClaimAdaptor.processSearchClaimPage(requestStub, responseStub);
      assert.equal(validatorStub.validateSearchClaimForm.callCount, 1);
      assert.equal(
        renderStub.calledOnceWithExactly(requestStub, responseStub, errors),
        true,
      );
    });

    it("renders the claim not-found page when the claim does not exist", async () => {
      responseStub.status.returns(responseStub);
      retrieveApplicationReferenceUseCaseStub.execute.resolves({
        status: "NOT_FOUND",
      });

      await searchClaimAdaptor.processSearchClaimPage(
        requestStub,
        responseStub,
      );

      assert.equal(responseStub.status.firstCall.args[0], 404);
      assert.equal(
        responseStub.render.firstCall.args[0],
        "application/claims/not-found",
      );
    });
  });
});
