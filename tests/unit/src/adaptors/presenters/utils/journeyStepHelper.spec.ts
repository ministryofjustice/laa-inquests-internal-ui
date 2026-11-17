import { strict as assert } from "assert";
import { StubbedInstance, stubInterface } from "ts-sinon";
import type { Request, Response } from "express";
import {
  completeStepAndRedirect,
  markStepComplete,
} from "#src/adaptors/presenter/utils/journeyStepHelper.js";
import { JOURNEY_TYPES } from "#src/infrastructure/config/journeySequences.js";

describe("journeyStepHelper", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    requestStub.session = {} as any;
  });

  describe("completeStepAndRedirect", () => {
    it("redirects to redirect url", () => {
      completeStepAndRedirect(
        requestStub,
        responseStub,
        "/applications/INQ-YYY-YYY/public-authorities/confirm",
        JOURNEY_TYPES.PUBLIC_AUTHORITY,
      );
      assert.equal(responseStub.redirect.callCount, 1);
      const redirectArgs = responseStub.redirect.getCall(0).args;
      assert.equal(
        redirectArgs[0],
        "/applications/INQ-YYY-YYY/public-authorities/confirm",
      );
    });

    it("marks the previous step complete before redirecting", () => {
      completeStepAndRedirect(
        requestStub,
        responseStub,
        "/applications/INQ-YYY-YYY/public-authorities/confirm",
        JOURNEY_TYPES.PUBLIC_AUTHORITY,
      );

      const session = requestStub.session as any;
      assert.equal(session.lastCompletedStepIndex, 0);
    });

    [
      {
        journey: JOURNEY_TYPES.PUBLIC_AUTHORITY,
        page: "/applications/INQ-YYY-YYY/public-authorities/confirm",
      },
      {
        journey: JOURNEY_TYPES.APPLICATION_DECISION,
        page: "/applications/INQ-YYY-YYY/decision",
      },
      {
        journey: JOURNEY_TYPES.CLAIM_DECISION,
        page: "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
      },
    ].forEach((journeyType: { journey: JOURNEY_TYPES; page: string }) => {
      it(`sets the current journey in session using the provided journey type: ${journeyType.journey}`, () => {
        completeStepAndRedirect(
          requestStub,
          responseStub,
          journeyType.page,
          journeyType.journey,
        );
        const session = requestStub.session as any;
        assert.equal(session.journeyType, journeyType.journey);
      });
    });

    it("sets lastStepCompleted as ZERO if res.redirect is first step", () => {
      completeStepAndRedirect(
        requestStub,
        responseStub,
        "/applications/INQ-YYY-YYY/public-authorities",
        JOURNEY_TYPES.PUBLIC_AUTHORITY,
      );
      const session = requestStub.session as any;
      assert.equal(session.lastCompletedStepIndex, 0);
    });

    it("strips query parameters when completing a step", () => {
      completeStepAndRedirect(
        requestStub,
        responseStub,
        "/applications/INQ-YYY-YYY/public-authorities?test=1",
        JOURNEY_TYPES.PUBLIC_AUTHORITY,
      );
      const session = requestStub.session as any;
      assert.equal(session.lastCompletedStepIndex, 0);
    });
  });

  describe("markStepComplete", () => {
    [
      {
        journey: JOURNEY_TYPES.PUBLIC_AUTHORITY,
        page: "/applications/INQ-YYY-YYY/public-authorities/confirm",
        expectedIndex: 1,
      },
      {
        journey: JOURNEY_TYPES.APPLICATION_DECISION,
        page: "/applications/INQ-YYY-YYY/decision",
        expectedIndex: 0,
      },
      {
        journey: JOURNEY_TYPES.CLAIM_DECISION,
        page: "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
        expectedIndex: 0,
      },
    ].forEach(({ journey, page, expectedIndex }) => {
      it(`marks ${page} as complete`, () => {
        markStepComplete(requestStub, page, journey);
        const sessionState = requestStub.session as any;
        assert.equal(sessionState.lastCompletedStepIndex, expectedIndex);
      });
    });

    it("throws for invalid URLs not in the journey sequence", () => {
      assert.throws(() => {
        markStepComplete(
          requestStub,
          "/invalid/path",
          JOURNEY_TYPES.PUBLIC_AUTHORITY,
        );
      }, /Unsupported pageToMark: \/invalid\/path/);
    });

    it("overwrites existing lastCompletedStepIndex", () => {
      requestStub.session.lastCompletedStepIndex = 0;

      markStepComplete(
        requestStub,
        "/applications/INQ-YYY-YYY/public-authorities/confirm",
        JOURNEY_TYPES.PUBLIC_AUTHORITY,
      );

      const sessionState = requestStub.session as any;
      assert.equal(sessionState.lastCompletedStepIndex, 1);
    });

    it("throws for invalid journey type", () => {
      assert.throws(() => {
        markStepComplete(
          requestStub,
          "/applications/INQ-YYY-YYY/public-authorities/confirm",
          "invalid" as any,
        );
      }, /Unknown journey type: invalid/);
    });
  });
});
