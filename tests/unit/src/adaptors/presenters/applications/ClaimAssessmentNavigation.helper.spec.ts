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

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    sessionHelperStub = stubInterface<SessionHelper>();
    helper = new ClaimAssessmentNavigationHelper(sessionHelperStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("prepareClaimAssessmentEntry", () => {
    it("clears claim approval session data on a fresh GET request", () => {
      requestStub.method = "GET";
      requestStub.query = {};

      helper.prepareClaimAssessmentEntry(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
      assert.deepStrictEqual(
        sessionHelperStub.clearSessionData.getCall(0).args,
        [requestStub, "claimApproval"],
      );
    });

    it("does not clear session data when arriving from check your answers", () => {
      requestStub.method = "GET";
      requestStub.query = { from: "check-your-answers" };

      helper.prepareClaimAssessmentEntry(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
    });

    it("does not clear session data for non-GET requests", () => {
      requestStub.method = "POST";
      requestStub.query = {};

      helper.prepareClaimAssessmentEntry(requestStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
    });
  });
});
