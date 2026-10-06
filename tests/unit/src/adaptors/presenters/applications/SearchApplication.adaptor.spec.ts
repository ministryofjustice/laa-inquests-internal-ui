import {
  StubbedInstance,
  stubInterface,
} from "#node_modules/ts-sinon/dist/index.js";
import { SearchApplicationAdaptor } from "#src/adaptors/presenter/applications/SearchApplication.adaptor.js";
import { strict as assert } from "assert";
import type { Request, Response } from "express";

describe("SearchApplicationAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
  });

  describe("renderSearchApplicationPage", () => {
    it("calls res.render with correct arguements", () => {
      const adaptor = new SearchApplicationAdaptor();
      adaptor.renderSearchApplicationPage(requestStub, responseStub);
      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/search");
    });
  });

  describe("processSearchApplicationPage", () => {
    beforeEach(() => {
      requestStub.body = { "application-reference": "INQ-REA-ELW" };
    });

    it("calls res.redirect with correct arguements", () => {
      const adaptor = new SearchApplicationAdaptor();
      adaptor.processSearchApplicationPage(requestStub, responseStub);
      assert.equal(responseStub.redirect.callCount, 1);
      const redirectArgs = responseStub.redirect.getCall(0).args;
      assert.equal(redirectArgs[0], "/applications/INQ-REA-ELW/overview");
    });
  });
});
