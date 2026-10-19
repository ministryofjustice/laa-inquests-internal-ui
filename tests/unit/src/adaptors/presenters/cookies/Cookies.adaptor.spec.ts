import { strict as assert } from "assert";
import type { Request, Response } from "express";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import { CookiesAdaptor } from "#src/adaptors/presenter/cookies/Cookies.adaptor.js";

describe("Cookies adaptor", () => {
  let cookiesAdaptor: CookiesAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    responseStub.status.returns(responseStub);
    requestStub = stubInterface<Request>();

    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    cookiesAdaptor = new CookiesAdaptor();

    it("renders reports page", () => {
      cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "main/cookies",
        { backUrl: "/" },
      ]);
    });
  });
});
