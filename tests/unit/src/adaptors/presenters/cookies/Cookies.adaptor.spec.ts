import { strict as assert } from "assert";
import type { Request, Response } from "express";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import { CookiesAdaptor } from "#src/adaptors/presenter/cookies/Cookies.adaptor.js";
import config from "#src/infrastructure/config/config.js";
import sinon from "sinon";
import { logger } from "#src/infrastructure/logging/logger.js";

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

  afterEach(() => {
    sinon.restore();
  });

  it("renders cookies page", () => {
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

  describe("hideBannerConfirmation", () => {
    it("returns to a safe current page without setting or clearing cookies", () => {
      for (const [returnTo, expectedUrl] of [
        ["/reports?filter=current", "/reports?filter=current"],
        ["//example.com", "/"],
      ]) {
        responseStub.redirect.resetHistory();
        requestStub.body = { returnTo };

        cookiesAdaptor.hideBannerConfirmation(requestStub, responseStub);

        assert.deepEqual(responseStub.redirect.firstCall.args, [expectedUrl]);
        assert.equal(responseStub.cookie.callCount, 0);
        assert.equal(responseStub.clearCookie.callCount, 0);
      }
    });
  });

  describe("saveBannerPreferences", () => {
    it("queues the matching confirmation after saving an accepted or rejected preference", () => {
      for (const additional of ["yes", "no"]) {
        requestStub.body = {
          cookies: { additional },
          returnTo: "/reports",
        };

        cookiesAdaptor.saveBannerPreferences(requestStub, responseStub);

        assert.equal(
          requestStub.session.cookieBannerConfirmation,
          additional === "yes" ? "accepted" : "rejected",
        );
      }
    });

    it("saves accepted banner consent for 365 days and redirects to the current page", () => {
      requestStub.body = {
        cookies: { additional: "yes" },
        returnTo: "/reports",
      };

      cookiesAdaptor.saveBannerPreferences(requestStub, responseStub);

      assert.equal(responseStub.cookie.callCount, 1);
      assert.deepEqual(responseStub.cookie.firstCall.args, [
        "cookies_policy",
        JSON.stringify({ has_tracking_consent: true }),
        {
          maxAge: 365 * 24 * 60 * 60 * 1000,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: config.app.useHttps,
        },
      ]);
      assert.deepEqual(responseStub.redirect.firstCall.args, ["/reports"]);
    });

    it("saves rejected banner consent without enabling tracking", () => {
      requestStub.body = {
        cookies: { additional: "no" },
        returnTo: "/reports",
      };

      cookiesAdaptor.saveBannerPreferences(requestStub, responseStub);

      assert.equal(responseStub.cookie.callCount, 1);
      assert.equal(responseStub.cookie.firstCall.args[0], "cookies_policy");
      assert.deepEqual(JSON.parse(responseStub.cookie.firstCall.args[1]), {
        has_tracking_consent: false,
      });
      assert.deepEqual(responseStub.redirect.firstCall.args, ["/reports"]);
    });

    it("uses only safe return URLs", () => {
      for (const returnTo of [
        undefined,
        "",
        ["//example.com"],
        "https://example.com",
        "//example.com",
        "/\\example.com",
        "/\t/example.com",
      ]) {
        responseStub.redirect.resetHistory();
        requestStub.body = {
          cookies: { additional: "no" },
          returnTo,
        };

        cookiesAdaptor.saveBannerPreferences(requestStub, responseStub);

        assert.deepEqual(responseStub.redirect.firstCall.args, ["/"]);
      }

      requestStub.body = {
        cookies: { additional: "yes" },
        returnTo: "/reports?filter=current",
      };
      cookiesAdaptor.saveBannerPreferences(requestStub, responseStub);
      assert.deepEqual(responseStub.redirect.lastCall.args, [
        "/reports?filter=current",
      ]);
    });
  });
});
