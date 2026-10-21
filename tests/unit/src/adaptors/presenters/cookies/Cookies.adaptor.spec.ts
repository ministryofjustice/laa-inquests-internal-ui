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
    requestStub.session.returnTo = "/"; //For GET
    requestStub.body = { acceptCookies: "yes" }; //For POST
    cookiesAdaptor = new CookiesAdaptor();
  });

  it("renders cookies page without success banner on initial page load", () => {
    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/", success: false },
    ]);
  });

  it("does not display the success banner save failure", () => {
    requestStub.query = { saved: "false" };
    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/", success: false },
    ]);
  });

  it("does not display the success banner when browser blocks cookies", () => {
    requestStub.cookies = {}; // Simulate browser blocking cookies
    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/", success: false },
    ]);
  });

  it("renders the success banner on successful save of cookies", () => {
    requestStub.cookies = { cookies_policy: { has_tracking_consent: true } };
    requestStub.query = { saved: "true" };
    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/", success: true },
    ]);
  });

  it("defaults returnTo to the home page when not provided", () => {
    requestStub.cookies = { cookies_policy: { has_tracking_consent: true } };
    requestStub.query = { saved: "true" };
    requestStub.session.returnTo = undefined;

    cookiesAdaptor.renderCookiesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "main/cookies",
      { returnTo: "/", success: true },
    ]);
  });

  describe("saveCookiesPreferences", () => {
    it("on success renders the cookies page with success banner", () => {
      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.redirect.callCount, 1);
      assert.deepEqual(responseStub.redirect.firstCall.args, [
        "/cookies?saved=true",
      ]);
    });

    it("on failure does not display success banner", () => {
      responseStub.cookie.throws(new Error("Cookie failure"));

      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.redirect.callCount, 1);
      assert.deepEqual(responseStub.redirect.firstCall.args, [
        "/cookies?saved=false",
      ]);
    });

    it("on failure does not display success banner", () => {
      responseStub.cookie.throws(new Error("Cookie failure"));

      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.redirect.callCount, 1);
      assert.deepEqual(responseStub.redirect.firstCall.args, [
        "/cookies?saved=false&returnTo=%2F",
      ]);
    });

    it("assigns hasTrackingConsent to true when user selects 'yes'", () => {
      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.cookie.callCount, 1);
      assert.equal(responseStub.cookie.firstCall.args[0], "cookies_policy");
      assert.deepEqual(responseStub.cookie.firstCall.args[1], {
        has_tracking_consent: true,
      });
    });

    it("assigns hasTrackingConsent to false when user selects 'no'", () => {
      requestStub.body = {
        acceptCookies: "no",
      };

      cookiesAdaptor.saveCookiesPreferences(requestStub, responseStub);

      assert.equal(responseStub.cookie.callCount, 1);
      assert.equal(responseStub.cookie.firstCall.args[0], "cookies_policy");
      assert.deepEqual(responseStub.cookie.firstCall.args[1], {
        has_tracking_consent: false,
      });
    });
  });
});
