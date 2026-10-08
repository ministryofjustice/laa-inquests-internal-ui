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
            assert.equal(renderArgs[0], "claim/search");
        });

    });

});
