import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request } from "express";
import { ConfirmCostsNavigationHelper } from "#src/adaptors/presenter/applications/ConfirmCostsNavigation.helper.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

describe("ConfirmCostsNavigationHelper", () => {
  let requestStub: StubbedInstance<Request>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let helper: ConfirmCostsNavigationHelper;

  const checkYourAnswersUrl = "/applications/123/claims/10/check-your-answers";
  const defaultUrl = "/applications/123/claims/10";

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    sessionHelperStub = stubInterface<SessionHelper>();
    sessionHelperStub.getSessionData.returns(null);
    helper = new ConfirmCostsNavigationHelper(sessionHelperStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("prepareConfirmCostsEntry", () => {
    it("captures the check your answers origin on a fresh GET request", () => {
      requestStub.method = "GET";
      requestStub.query = { from: "check-your-answers" };

      helper.prepareConfirmCostsEntry(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.storeSessionData.getCall(0).args,
        [requestStub, "claimApproval", { returnToCheckYourAnswers: "true" }],
      );
    });

    it("does not capture the origin for non-GET requests", () => {
      requestStub.method = "POST";
      requestStub.query = { from: "check-your-answers" };

      helper.prepareConfirmCostsEntry(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    });

    it("clears a previously set return flag on a fresh GET entry", () => {
      requestStub.method = "GET";
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      helper.prepareConfirmCostsEntry(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.storeSessionData.getCall(0).args,
        [requestStub, "claimApproval", { returnToCheckYourAnswers: "" }],
      );
    });

    it("does nothing when there is no origin and no return flag set", () => {
      requestStub.method = "GET";
      requestStub.query = {};

      helper.prepareConfirmCostsEntry(requestStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    });
  });

  describe("resolveBackUrl", () => {
    it("returns the check your answers url when the return flag is set", () => {
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      const result = helper.resolveBackUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, checkYourAnswersUrl);
    });

    it("returns the default url when the return flag is not set", () => {
      requestStub.query = {};

      const result = helper.resolveBackUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, defaultUrl);
    });
  });

  describe("resolveNextUrl", () => {
    it("returns the check your answers url when the return flag is set", () => {
      requestStub.query = {};
      sessionHelperStub.getSessionData.returns({
        returnToCheckYourAnswers: "true",
      });

      const result = helper.resolveNextUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, checkYourAnswersUrl);
    });

    it("returns the default url when the return flag is not set", () => {
      requestStub.query = {};

      const result = helper.resolveNextUrl(
        requestStub,
        checkYourAnswersUrl,
        defaultUrl,
      );

      assert.equal(result, defaultUrl);
    });
  });
});
