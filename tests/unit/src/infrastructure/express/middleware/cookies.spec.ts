import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import sinon from "sinon";
import processCookies from "#src/infrastructure/express/middleware/cookies/cookies.js";
import { logger } from "#src/infrastructure/logging/logger.js";

describe("processCookies", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("assigns hasTrackingConsent to false when cookies_policy undefined", () => {
    assert.equal(res.locals.hasTrackingConsent, undefined);
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, false);
  });

  it("assigns hasTrackingConsent to true when cookies_policy.has_tracking_consent is true", () => {
    req.cookies = {
      cookies_policy: encodeURIComponent(
        JSON.stringify({
          has_tracking_consent: true,
        }),
      ),
    };
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, true);
  });

  it("assigns hasTrackingConsent to false when cookies_policy.has_tracking_consent is false", () => {
    req.cookies = {
      cookies_policy: encodeURIComponent(
        JSON.stringify({
          has_tracking_consent: false,
        }),
      ),
    };
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, false);
  });

  it("assigns hasTrackingConsent to false when cookies_policy is invalid JSON", () => {
    req.cookies = {
      cookies_policy: "invalid_json",
    };
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, false);
  });

  it("assigns hasTrackingConsent to false when cookies_policy does not contain has_tracking_consent", () => {
    req.cookies = {
      cookies_policy: encodeURIComponent("{}"),
    };
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, false);
  });

  it("assigns hasTrackingConsent to false when cookies_policy.has_tracking_consent is not a boolean", () => {
    req.cookies = {
      cookies_policy: encodeURIComponent(
        JSON.stringify({
          has_tracking_consent: 123,
        }),
      ),
    };
    processCookies(req, res, next);
    assert.equal(res.locals.hasTrackingConsent, false);
  });

  it("calls next after successful assignment", () => {
    req.cookies = {
      cookies_policy: encodeURIComponent(
        JSON.stringify({
          has_tracking_consent: true,
        }),
      ),
    };
    processCookies(req, res, next);
    assert.ok(next.calledOnce);
  });

  it("calls next when cookies_policy is invalid json", () => {
    req.cookies = {
      cookies_policy: "invalid_json",
    };
    processCookies(req, res, next);
    assert.ok(next.calledOnce);
  });

  it("logs error on invalid json", () => {
    const logSpy = sinon.spy(logger, "logError");
    req.cookies = {
      cookies_policy: "invalid_json",
    };
    processCookies(req, res, next);
    assert.equal(logSpy.callCount, 1);
  });
});
