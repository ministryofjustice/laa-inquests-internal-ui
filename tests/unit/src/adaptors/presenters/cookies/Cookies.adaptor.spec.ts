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
    requestStub.query = { returnTo: "/" }; //For GET
    requestStub.body = { returnTo: "/", acceptCookies: "yes" }; //For POST
    cookiesAdaptor = new CookiesAdaptor();
  });

  it("renders cookies page", () => {
    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/" },
    ]);
  });

  describe("saveCookiesPreferences", () => {
    it("on success renders the cookies page with success banner", () => {
      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "main/cookies",
        { success: true, returnTo: "/", acceptCookies: "yes" },
      ]);
    });

    it("assigns hasTrackingConsent to true when user selects 'yes'", () => {
      requestStub.body = {
        acceptCookies: "yes",
        returnTo: "/",
      };

      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "main/cookies",
        { success: true, returnTo: "/", acceptCookies: "yes" },
      ]);
    });

    it("assigns hasTrackingConsent to false when user selects 'no'", () => {
      requestStub.body = {
        acceptCookies: "no",
        returnTo: "/",
      };

      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "main/cookies",
        { success: true, returnTo: "/", acceptCookies: "no" },
      ]);
    });
  });
});
