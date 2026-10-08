import {
  StubbedInstance,
  stubInterface,
} from "#node_modules/ts-sinon/dist/index.js";
import type { Request, Response } from "express";
import { strict as assert } from "assert";
import { stub } from "sinon";

import { SearchClaimAdaptor } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.adaptor.js";
import { SearchClaimValidator } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.validator.js";

describe("SearchClaimAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let validatorStub: StubbedInstance<SearchClaimValidator>;
  let searchClaimAdaptor: SearchClaimAdaptor;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    validatorStub = stubInterface<SearchClaimValidator>();
    //validatorStub.validateSearchClaimForm.returns({});
    searchClaimAdaptor = new SearchClaimAdaptor(validatorStub);
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
        applicationReference: {
          text: "Example error",
        },
      };
      searchClaimAdaptor.renderSearchClaimPage(requestStub, responseStub, errors);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[1], errors);
    });
  });

describe("processSearchClaimPage", () => {
    beforeEach(() => {
      requestStub.body = { "claim-reference": "INQC-ELTH-NVX7" };
    });

    it("calls res.redirect with correct arguements", () => {
      searchClaimAdaptor.processSearchClaimPage(requestStub, responseStub);
      assert.equal(responseStub.redirect.callCount, 1);
      const redirectArgs = responseStub.redirect.getCall(0).args;
      assert.equal(redirectArgs[0], "/applications/INQC-ELTH-NVX7/overview");
    });

  });

});
