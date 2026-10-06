import {
  StubbedInstance,
  stubInterface,
} from "#node_modules/ts-sinon/dist/index.js";
import { SearchApplicationAdaptor } from "#src/adaptors/presenter/applications/SearchApplication.adaptor.js";
import { SearchApplicationValidator } from "#src/adaptors/presenter/applications/SearchApplication.validator.js";
import { strict as assert } from "assert";
import { stub } from "sinon";
import type { Request, Response } from "express";

describe("SearchApplicationAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let validatorStub: StubbedInstance<SearchApplicationValidator>;
  let adaptor: SearchApplicationAdaptor;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    validatorStub = stubInterface<SearchApplicationValidator>();
    validatorStub.validateSearchApplicationForm.returns({});
    adaptor = new SearchApplicationAdaptor(validatorStub);
  });

  describe("renderSearchApplicationPage", () => {
    it("calls res.render with correct arguements", () => {
      adaptor.renderSearchApplicationPage(requestStub, responseStub);
      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/search");
    });

    it("passes errors object into res.render", () => {
      const errors = {
        applicationReference: {
          text: "Example error",
        },
      };
      adaptor.renderSearchApplicationPage(requestStub, responseStub, errors);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[1], errors);
    });
  });

  describe("processSearchApplicationPage", () => {
    beforeEach(() => {
      requestStub.body = { "application-reference": "INQ-REA-ELW" };
    });

    it("calls res.redirect with correct arguements", () => {
      adaptor.processSearchApplicationPage(requestStub, responseStub);
      assert.equal(responseStub.redirect.callCount, 1);
      const redirectArgs = responseStub.redirect.getCall(0).args;
      assert.equal(redirectArgs[0], "/applications/INQ-REA-ELW/overview");
    });

    it("calls renderSearchApplicationPage with expected errors", () => {
      const errors = {
        applicationReference: {
          text: "Example error",
        },
      };
      validatorStub.validateSearchApplicationForm.returns(errors);

      const renderStub = stub(adaptor, "renderSearchApplicationPage");

      adaptor.processSearchApplicationPage(requestStub, responseStub);
      assert.equal(validatorStub.validateSearchApplicationForm.callCount, 1);
      assert.equal(
        renderStub.calledOnceWithExactly(requestStub, responseStub, errors),
        true,
      );
    });
  });
});
