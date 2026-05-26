import { strict as assert } from "assert";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { TypedRequest } from "#src/infrastructure/express/api.types.js";
import { IdParams } from "#src/infrastructure/express/api.types.js";
import {
  ApplicationDecisionForm,
  JustificationForm,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";

describe("ApplicationDecisionAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub:
    | StubbedInstance<Request>
    | StubbedInstance<TypedRequest<ApplicationDecisionForm, IdParams>>;
  let viewApplicationSourceStub: StubbedInstance<ViewApplicationPort>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let adaptor: ApplicationDecisionAdaptor;

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
    viewApplicationSourceStub = stubInterface<ViewApplicationPort>();
    sessionHelperStub = stubInterface<SessionHelper>();
    adaptor = new ApplicationDecisionAdaptor(
      viewApplicationSourceStub,
      sessionHelperStub,
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
    beforeEach(() => {
      requestStub.params = { applicationId };
      requestStub.body = { "overall-decision": "REFUSED" };
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
  });

  describe("processJustificationForm", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
      requestStub.body = {
        "refusal-reason": "not-in-scope",
        justification: "some justification",
      };
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
  });

  describe("renderConfirmationPage", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
    });

    it("calls res.render with the correct view name", () => {
      sessionHelperStub.getSessionData.returns({});

      adaptor.renderConfirmationPage(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/decision/confirmation/index",
      );
    });

    it("calls res.render with the correct variables", () => {
      const sessionData = {
        overallDecision: "REFUSED",
        refusalReason: "not-in-scope",
        justification: "some justification",
      };
      sessionHelperStub.getSessionData.returns(sessionData);

      adaptor.renderConfirmationPage(requestStub as Request, responseStub);

      assert.deepEqual(responseStub.render.getCall(0).args[1], {
        backUrl: `/applications/${applicationId}/decision/justification`,
        applicationId,
        proceeding: sessionData,
        overallDecisionLabel: "Refuse",
        refusalReasonLabel: "Not in scope",
        justification: "some justification",
      });
    });

    it("falls back to the raw value when a label is not found", () => {
      sessionHelperStub.getSessionData.returns({
        overallDecision: "UNKNOWN",
        refusalReason: "unknown-reason",
      });

      adaptor.renderConfirmationPage(requestStub as Request, responseStub);

      const renderVars = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.equal(renderVars.overallDecisionLabel, "UNKNOWN");
      assert.equal(renderVars.refusalReasonLabel, "unknown-reason");
    });
  });

  describe("processConfirmationForm", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
    });

    it("submits the merits decision from session to the API", async () => {
      sessionHelperStub.getSessionData.returns({ overallDecision: "REFUSED" });
      viewApplicationSourceStub.submitMeritsDecision.resolves();

      await adaptor.processConfirmationForm(
        requestStub as Request,
        responseStub,
      );

      assert.equal(viewApplicationSourceStub.submitMeritsDecision.callCount, 1);
      assert.deepEqual(
        viewApplicationSourceStub.submitMeritsDecision.getCall(0).args,
        [applicationId, "REFUSED"],
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
