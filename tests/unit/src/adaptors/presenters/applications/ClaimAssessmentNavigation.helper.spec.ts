import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request } from "express";
import { ClaimAssessmentNavigationHelper } from "#src/adaptors/presenter/applications/ClaimAssessmentNavigation.helper.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

describe("ClaimAssessmentNavigationHelper", () => {
  let requestStub: StubbedInstance<Request>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let helper: ClaimAssessmentNavigationHelper;

  const checkYourAnswersUrl = "/applications/123/claims/10/check-your-answers";
  const defaultUrl = "/applications/123/claims/10";

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    sessionHelperStub = stubInterface<SessionHelper>();
    sessionHelperStub.getSessionData.returns(null);
    helper = new ClaimAssessmentNavigationHelper(sessionHelperStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("clearChangeLinkReturnOnFreshVisit", () => {
    it("clears claim approval session data on a fresh GET request", () => {
      requestStub.method = "GET";
      requestStub.query = {};

      helper.clearChangeLinkReturnOnFreshVisit(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.clearSessionData.getCall(0).args,
        [requestStub, "claimApproval"],
      );
    });

    it("does not clear session data when arriving from check your answers", () => {
      requestStub.method = "GET";
      requestStub.query = { from: "check-your-answers" };

      helper.clearChangeLinkReturnOnFreshVisit(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
    });

    it("does not clear session data for non-GET requests", () => {
      requestStub.method = "POST";
      requestStub.query = {};

      helper.clearChangeLinkReturnOnFreshVisit(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
    });
  });

  describe("syncChangeLinkReturnFlag", () => {
    it("captures the check your answers origin on a fresh GET request", () => {
      requestStub.method = "GET";
      requestStub.query = { from: "check-your-answers" };

      helper.syncChangeLinkReturnFlag(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.storeSessionData.getCall(0).args,
        [requestStub, "claimApproval", { returnToCheckYourAnswers: "true" }],
      );
    });

    it("does not capture the origin for non-GET requests", () => {
      requestStub.method = "POST";
      requestStub.query = { from: "check-your-answers" };

      helper.syncChangeLinkReturnFlag(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    });

    it("clears a previously set return flag on a fresh GET entry", () => {
      requestStub.method = "GET";
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      helper.syncChangeLinkReturnFlag(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.storeSessionData.getCall(0).args,
        [requestStub, "claimApproval", { returnToCheckYourAnswers: "" }],
      );
    });

    it("does nothing when there is no origin and no return flag set", () => {
      requestStub.method = "GET";
      requestStub.query = {};

      helper.syncChangeLinkReturnFlag(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    });
  });

  describe("resolveBackLinkUrl", () => {
    it("returns the check your answers url when the return flag is set", () => {
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      const result = helper.resolveBackLinkUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, checkYourAnswersUrl);
    });

    it("returns the default url when the return flag is not set", () => {
      requestStub.query = {};

      const result = helper.resolveBackLinkUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, defaultUrl);
    });
  });

  describe("resolveContinueUrl", () => {
    it("returns the check your answers url when the return flag is set", () => {
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      const result = helper.resolveContinueUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, checkYourAnswersUrl);
    });

    it("returns the default url when the return flag is not set", () => {
      requestStub.query = {};

      const result = helper.resolveContinueUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, defaultUrl);
    });
  });
});
