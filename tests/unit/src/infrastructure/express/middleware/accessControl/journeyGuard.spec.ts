import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { Request, Response } from "express";
import { createJourneyGuard } from "#src/infrastructure/express/middleware/accessControl/journeyGuard.js";
import { JOURNEY_NOT_STARTED } from "#src/adaptors/presenter/utils/journeyStepHelper.js";
import {
  JOURNEY_TYPES,
  JOURNEYS,
} from "#src/infrastructure/config/journeySequences.js";

const TEST_JOURNEY_SEQUENCE = [
  "/apply/step-1",
  "/apply/step-2",
  "/apply/step-3",
  "/apply/step-4",
  "/apply/confirmation",
] as const;

describe("journeyGuard middleware", () => {
  let requestStub: Record<string, any>;
  let responseStub: Response;
  let nextSpy: sinon.SinonSpy;

  beforeEach(() => {
    requestStub = stubInterface<Request>() as Record<string, any>;
    responseStub = stubInterface<Response>();
    nextSpy = sinon.spy();

    requestStub.session = {};
    requestStub.originalUrl = "/apply/step-1";

    responseStub.redirect = sinon.spy();
  });

  describe("createJourneyGuard factory", () => {
    it("creates a middleware function", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      assert(typeof middleware === "function");
    });

    it("creates independent middleware instances", () => {
      const middleware1 = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      const middleware2 = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      assert.notStrictEqual(middleware1, middleware2);
    });
  });

  describe("step access control", () => {
    it("allows access to the first step", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.originalUrl = "/apply/step-1";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access to step immediately after last completed step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access to already-completed steps", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 2,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("redirects when attempting to skip one step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/check-your-answers";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(!nextSpy.called);
      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
      );
    });

    it("redirects when attempting to skip multiple steps", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/paid-in-full";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(!nextSpy.called);
      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
      );
    });
  });

  describe("session state handling", () => {
    it("treats missing lastCompletedStepIndex as JOURNEY_NOT_STARTED", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.session = {};
      requestStub.originalUrl = "/apply/step-1";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("treats non-numeric lastCompletedStepIndex as JOURNEY_NOT_STARTED", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.session = {
        apply: { lastCompletedStepIndex: "invalid" },
      };
      requestStub.originalUrl = "/apply/step-1";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access to next step after completing a later step in sequence", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 3,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-disbursement-costs";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });
  });

  describe("originalUrl handling", () => {
    it("allows access to originalUrls not in the journey sequence", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.originalUrl = "/apply/some-utility-endpoint";

      middleware(requestStub as any, responseStub, nextSpy);

      // Should bypass the guard
      assert(nextSpy.calledOnce);
    });

    it("handles originalUrls with trailing slashes", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.session = {};
      // originalUrl has trailing slash but not in sequence
      requestStub.originalUrl = "/apply/step-1/";

      middleware(requestStub as any, responseStub, nextSpy);

      // Should not match and bypass the guard
      assert(nextSpy.calledOnce);
    });
  });

  describe("journey type isolation", () => {
    it("redirects to start of journey when journey type does not match", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 4,
        journeyType: JOURNEY_TYPES.APPLICATION_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/paid-in-full";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(!nextSpy.called);
      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
      );
    });

    it("allows access to first step in journey when journeyType does not match", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 2,
        journeyType: JOURNEY_TYPES.APPLICATION_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });
  });

  describe("Current path handling", () => {
    it("allows access when current path is included in visitedJourneyPages", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 1,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
        visitedJourneyPages: [
          "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
          "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
          "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-disbursement-costs",
        ],
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access when current path is the first step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
        visitedJourneyPages: [],
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access when completePages is undefined and accessing the first step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("redirects when current path is not included in visitedJourneyPages and is not the first step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
        visitedJourneyPages: [
          "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
          "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
        ],
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-disbursement-costs";

      middleware(requestStub as any, responseStub, nextSpy);

      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
      );
    });
  });

  describe("boundary conditions", () => {
    it("allows access to final step after completing penultimate step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
      });

      requestStub.session = {
        lastCompletedStepIndex: 4,
        journeyType: JOURNEY_TYPES.CLAIM_DECISION,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/paid-in-full";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("allows access to final step", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.PUBLIC_AUTHORITY],
      });

      requestStub.session = {
        lastCompletedStepIndex: 0,
        journeyType: JOURNEY_TYPES.PUBLIC_AUTHORITY,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/public-authorities/confirm";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });

    it("redirects to first step when lastCompletedStepIndex is out of bounds", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.PUBLIC_AUTHORITY],
      });

      // lastCompletedStepIndex beyond sequence length
      requestStub.session = {
        lastCompletedStepIndex: 999,
        journeyType: JOURNEY_TYPES.PUBLIC_AUTHORITY,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/public-authorities/confirm";

      middleware(requestStub as any, responseStub, nextSpy);

      // Should redirect to first step when index is out of bounds
      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/public-authorities",
      );
    });

    it("redirects to first step when lastCompletedStepIndex is negative", () => {
      const middleware = createJourneyGuard({
        journeySequence: JOURNEYS[JOURNEY_TYPES.PUBLIC_AUTHORITY],
      });

      // lastCompletedStepIndex is negative
      requestStub.session = {
        lastCompletedStepIndex: -999,
        journeyType: JOURNEY_TYPES.PUBLIC_AUTHORITY,
      };
      requestStub.originalUrl =
        "/applications/INQ-YYY-YYY/public-authorities/confirm";

      middleware(requestStub as any, responseStub, nextSpy);

      // Should redirect to first step
      assert((responseStub.redirect as any).calledOnce);
      assert.strictEqual(
        (responseStub.redirect as any).firstCall.args[0],
        "/applications/INQ-YYY-YYY/public-authorities",
      );
    });
  });

  describe("JOURNEY_NOT_STARTED constant usage", () => {
    it("matches expected value", () => {
      assert.strictEqual(JOURNEY_NOT_STARTED, -1);
    });

    it("correctly represents no steps completed", () => {
      const middleware = createJourneyGuard({
        journeySequence: TEST_JOURNEY_SEQUENCE,
      });

      requestStub.session = {
        lastCompletedStepIndex: JOURNEY_NOT_STARTED,
      };
      requestStub.originalUrl = "/apply/step-1";

      middleware(requestStub as any, responseStub, nextSpy);

      assert(nextSpy.calledOnce);
    });
  });
});
