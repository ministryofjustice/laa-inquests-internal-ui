import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { TypedRequest } from "#src/infrastructure/express/api.types.js";
import { IdParams } from "#src/infrastructure/express/api.types.js";
import {
  ApplicationDecisionForm,
  JustificationForm,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ApplicationDecisionValidator } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.validator.js";

describe("ApplicationDecisionAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub:
    | StubbedInstance<Request>
    | StubbedInstance<TypedRequest<ApplicationDecisionForm, IdParams>>;
  let viewApplicationSourceStub: StubbedInstance<ApplicationPort>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let adaptor: ApplicationDecisionAdaptor;
  let validator: ApplicationDecisionValidator;

  const applicationId = "1";
  const mockProceeding = {
    proceedingId: "MN035",
    proceedingDescription: "Clinical Negligence",
    categoryOfLaw: "INQUEST",
    certificateType: "SUBSTANTIVE",
    levelOfService: "FULL",
    matterType: "INQUEST",
    scopeLimitationHeading: "Scope",
    scopeDescription: "Full scope",
    substantiveCostLimitation: 1000,
    clientInvolvementType: "APPLICANT",
    meritsDecision: "PENDING",
  };

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    viewApplicationSourceStub = stubInterface<ApplicationPort>();
    sessionHelperStub = stubInterface<SessionHelper>();
    validator = new ApplicationDecisionValidator();
    adaptor = new ApplicationDecisionAdaptor(
      viewApplicationSourceStub,
      sessionHelperStub,
      validator,
    );
    requestStub.params = { applicationId };
  });

  describe("renderApplicationDecisionForm", () => {
    it("throws an error if there are no proceedings", async () => {
      viewApplicationSourceStub.getApplication.resolves({
        proceedings: [],
      } as any);

      await assert.rejects(
        () =>
          adaptor.renderApplicationDecisionForm(
            requestStub as Request,
            responseStub,
          ),
        new Error("Application has no proceedings"),
      );
    });

    it("calls res.render with the correct view name", async () => {
      viewApplicationSourceStub.getApplication.resolves({
        overallDecision: "PENDING",
        proceedings: [mockProceeding],
      } as any);

      await adaptor.renderApplicationDecisionForm(
        requestStub as Request,
        responseStub,
      );

      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/decision/index");
    });

    it("calls res.render with the correct variables", async () => {
      viewApplicationSourceStub.getApplication.resolves({
        overallDecision: "PENDING",
        proceedings: [mockProceeding],
      } as any);
      sessionHelperStub.getSessionData.returns({ overallDecision: "REFUSED" });

      await adaptor.renderApplicationDecisionForm(
        requestStub as Request,
        responseStub,
      );

      const renderArgs = responseStub.render.getCall(0).args;
      assert.deepEqual(renderArgs[1], {
        backUrl: `/applications/${applicationId}/overview`,
        applicationId,
        proceeding: {
          certificateType: "Substantive",
          meritsDecision: "Pending",
        },
        overallDecision: "REFUSED",
      });
    });
  });

  describe("processApplicationDecisionForm", () => {
    let renderApplicationDecisionFormSpy: sinon.SinonSpy;

    beforeEach(() => {
      requestStub.params = { applicationId };
      requestStub.body = { "overall-decision": "REFUSED" };
      renderApplicationDecisionFormSpy = sinon.spy(
        adaptor,
        "renderApplicationDecisionForm",
      );
    });

    afterEach(() => {
      renderApplicationDecisionFormSpy.restore();
    });

    it("saves overallDecision to session", () => {
      adaptor.processApplicationDecisionForm(
        requestStub as TypedRequest<ApplicationDecisionForm, IdParams>,
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      const storeArgs = sessionHelperStub.storeSessionData.getCall(0).args;
      assert.deepEqual(storeArgs, [
        requestStub,
        "decision",
        { overallDecision: "REFUSED" },
      ]);
    });

    it("redirects to the justification page", () => {
      adaptor.processApplicationDecisionForm(
        requestStub as TypedRequest<ApplicationDecisionForm, IdParams>,
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/decision/justification`,
      );
    });

    it("saves session data even when there are validation errors", () => {
      requestStub.body = { "overall-decision": "" };
      sessionHelperStub.getSessionData.returns({});

      adaptor.processApplicationDecisionForm(
        requestStub as TypedRequest<ApplicationDecisionForm, IdParams>,
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      const storeArgs = sessionHelperStub.storeSessionData.getCall(0).args;
      assert.deepEqual(storeArgs, [
        requestStub,
        "decision",
        { overallDecision: "" },
      ]);
    });

    it("re-renders the decision page with validation error when overall decision is missing", () => {
      requestStub.body = { "overall-decision": "" };
      sessionHelperStub.getSessionData.returns({});

      adaptor.processApplicationDecisionForm(
        requestStub as TypedRequest<ApplicationDecisionForm, IdParams>,
        responseStub,
      );

      assert.ok(renderApplicationDecisionFormSpy.calledOnce);
      assert.deepEqual(renderApplicationDecisionFormSpy.getCall(0).args[2], {
        overallDecision: {
          text: en.pages.decision.merits.radio.validationError.notEmpty,
        },
      });
    });
  });

  describe("renderJustificationForm", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
    });

    it("calls res.render with the correct view name", () => {
      sessionHelperStub.getSessionData.returns({});

      adaptor.renderJustificationForm(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/decision/justification/index",
      );
    });

    it("calls res.render with the correct variables", () => {
      sessionHelperStub.getSessionData.returns({
        refusalReason: "not-in-scope",
        justification: "some justification",
      });

      adaptor.renderJustificationForm(requestStub as Request, responseStub);

      assert.deepEqual(responseStub.render.getCall(0).args[1], {
        backUrl: `/applications/${applicationId}/decision`,
        laaReference: applicationId,
        refusalReason: "not-in-scope",
        justification: "some justification",
      });
    });

    it("includes errorSummaries in render variables when provided", () => {
      sessionHelperStub.getSessionData.returns({
        refusalReason: "not-in-scope",
        justification: "some justification",
      });
      const errorSummaries = {
        decisionReason: {
          text: en.pages.decision.justification.radio.validationErrors.notEmpty,
        },
      };

      adaptor.renderJustificationForm(
        requestStub as Request,
        responseStub,
        errorSummaries,
      );

      assert.deepEqual(responseStub.render.getCall(0).args[1], {
        backUrl: `/applications/${applicationId}/decision`,
        laaReference: applicationId,
        refusalReason: "not-in-scope",
        justification: "some justification",
        errorSummaries,
      });
    });
  });

  describe("processJustificationForm", () => {
    let renderJustificationFormSpy: sinon.SinonSpy;

    beforeEach(() => {
      requestStub.params = { applicationId };
      requestStub.body = {
        "refusal-reason": "not-in-scope",
        justification: "some justification",
      };
      renderJustificationFormSpy = sinon.spy(
        adaptor,
        "renderJustificationForm",
      );
    });

    afterEach(() => {
      renderJustificationFormSpy.restore();
    });

    it("saves refusalReason and justification to session, merged with existing data", () => {
      sessionHelperStub.getSessionData.returns({ overallDecision: "REFUSED" });

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepEqual(sessionHelperStub.storeSessionData.getCall(0).args, [
        requestStub,
        "decision",
        {
          overallDecision: "REFUSED",
          refusalReason: "not-in-scope",
          justification: "some justification",
        },
      ]);
    });

    it("redirects to the confirmation page", () => {
      sessionHelperStub.getSessionData.returns({});

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/decision/confirmation`,
      );
    });

    it("saves session data even when there are validation errors", () => {
      requestStub.body = { "refusal-reason": "", justification: "" };
      sessionHelperStub.getSessionData.returns({});

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
    });

    it("re-renders with correct error summaries based on which fields are empty", () => {
      requestStub.body = { "refusal-reason": "", justification: "" };
      sessionHelperStub.getSessionData.returns({
        refusalReason: "not-in-scope",
        justification: "some justification",
      });

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.ok(renderJustificationFormSpy.calledOnce);
      assert.deepEqual(renderJustificationFormSpy.getCall(0).args[2], {
        decisionReason: {
          text: en.pages.decision.justification.radio.validationErrors.notEmpty,
        },
        decisionJustification: {
          text: en.pages.decision.justification.textarea.validationErrors
            .notEmpty,
        },
      });
    });

    it("re-renders with a too long error when justification exceeds 1500 characters", () => {
      requestStub.body = {
        "refusal-reason": "not-in-scope",
        justification: "a".repeat(1501),
      };
      sessionHelperStub.getSessionData.returns({
        refusalReason: "not-in-scope",
        justification: "a".repeat(1501),
      });

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.ok(renderJustificationFormSpy.calledOnce);
      assert.deepEqual(renderJustificationFormSpy.getCall(0).args[2], {
        decisionJustification: {
          text: en.pages.decision.justification.textarea.validationErrors
            .tooLong,
        },
      });
    });

    it("re-renders with an invalid characters error when justification contains non-unicode characters", () => {
      requestStub.body = {
        "refusal-reason": "not-in-scope",
        justification: "\uD800",
      };
      sessionHelperStub.getSessionData.returns({
        refusalReason: "not-in-scope",
        justification: "\uD800",
      });

      adaptor.processJustificationForm(
        requestStub as unknown as TypedRequest<JustificationForm, IdParams>,
        responseStub,
      );

      assert.ok(renderJustificationFormSpy.calledOnce);
      assert.deepEqual(renderJustificationFormSpy.getCall(0).args[2], {
        decisionJustification: {
          text: en.pages.decision.justification.textarea.validationErrors
            .invalidCharacters,
        },
      });
    });
  });

  describe("renderConfirmationPage", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
    });

    it("calls res.render with the correct view name and variables", () => {
      const sessionData = {
        overallDecision: "REFUSED",
        refusalReason: "not-in-scope",
        justification: "some justification",
      };
      sessionHelperStub.getSessionData.returns(sessionData);

      adaptor.renderConfirmationPage(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/decision/confirmation/index",
      );

      assert.deepEqual(responseStub.render.getCall(0).args[1], {
        backUrl: `/applications/${applicationId}/decision/justification`,
        applicationId,
        proceeding: sessionData,
        overallDecision: "REFUSED",
        refusalReasonLabel: "Not in scope",
        justification: "some justification",
      });
    });

    it("falls back to the raw refusal reason value when a label is not found", () => {
      sessionHelperStub.getSessionData.returns({
        overallDecision: "REFUSED",
        refusalReason: "unknown-reason",
      });

      adaptor.renderConfirmationPage(requestStub as Request, responseStub);

      const renderVars = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.equal(renderVars.refusalReasonLabel, "unknown-reason");
    });
  });

  describe("processConfirmationForm", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
    });

    it("submits the merits decision with refusalReason and justification when present in session", async () => {
      sessionHelperStub.getSessionData.returns({
        overallDecision: "REFUSED",
        refusalReason: "not-in-scope",
        justification: "This case is not in scope",
      });
      viewApplicationSourceStub.submitMeritsDecision.resolves();

      await adaptor.processConfirmationForm(
        requestStub as Request,
        responseStub,
      );

      assert.equal(viewApplicationSourceStub.submitMeritsDecision.callCount, 1);
      assert.deepEqual(
        viewApplicationSourceStub.submitMeritsDecision.getCall(0).args,
        [
          applicationId,
          "REFUSED",
          {
            refusalReason: "not-in-scope",
            justification: "This case is not in scope",
          },
        ],
      );
    });

    it("redirects to the success page", async () => {
      sessionHelperStub.getSessionData.returns({ overallDecision: "REFUSED" });
      viewApplicationSourceStub.submitMeritsDecision.resolves();

      await adaptor.processConfirmationForm(
        requestStub as Request,
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/decision/success`,
      );
    });

    it("throws when submitting the merits decision fails", async () => {
      sessionHelperStub.getSessionData.returns({ overallDecision: "REFUSED" });
      viewApplicationSourceStub.submitMeritsDecision.rejects(
        new Error("Merits rejection failed"),
      );

      await assert.rejects(
        () =>
          adaptor.processConfirmationForm(requestStub as Request, responseStub),
        new Error("Unable to submit merits decision"),
      );
    });
  });

  describe("renderDecisionSuccessPage", () => {
    it("calls res.render with the correct view name", () => {
      adaptor.renderDecisionSuccessPage(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/decision/success/index",
      );
    });

    it("calls res.render with the correct variables", () => {
      adaptor.renderDecisionSuccessPage(requestStub as Request, responseStub);

      assert.deepEqual(responseStub.render.getCall(0).args[1], {
        applicationId,
        backUrl: `/applications/${applicationId}/decision/confirmation`,
      });
    });

    it("clears the decision session data", () => {
      adaptor.renderDecisionSuccessPage(requestStub as Request, responseStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
      assert.deepEqual(sessionHelperStub.clearSessionData.getCall(0).args, [
        requestStub,
        "decision",
      ]);
    });
  });
});
