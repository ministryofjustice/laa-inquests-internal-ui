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

  it("calls res.render with correct arguements", () => {
    const adaptor = new SearchApplicationAdaptor();
    adaptor.renderSearchApplicationPage(requestStub, responseStub);
    assert.equal(responseStub.render.callCount, 1);
    const renderArgs = responseStub.render.getCall(0).args;
    assert.equal(renderArgs[0], "application/search");
  });
});
