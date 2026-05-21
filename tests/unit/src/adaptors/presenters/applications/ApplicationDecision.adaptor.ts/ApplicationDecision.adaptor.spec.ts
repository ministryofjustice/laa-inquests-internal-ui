import { strict as assert } from "assert";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

describe("ApplicationDecisionAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
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
        () => adaptor.renderApplicationDecisionForm(requestStub, responseStub),
        new Error("Application has no proceedings"),
      );
    });

    it("calls res.render with the correct view name", async () => {
      viewApplicationSourceStub.getApplication.resolves({
        proceedings: [mockProceeding],
      } as any);

      await adaptor.renderApplicationDecisionForm(requestStub, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      const renderArgs = responseStub.render.getCall(0).args;
      assert.equal(renderArgs[0], "application/decision/index");
    });

    it("calls res.render with the correct variables", async () => {
      viewApplicationSourceStub.getApplication.resolves({
        proceedings: [mockProceeding],
      } as any);
      sessionHelperStub.getSessionData.returns({ overallDecision: "refuse" });

      await adaptor.renderApplicationDecisionForm(requestStub, responseStub);

      const renderArgs = responseStub.render.getCall(0).args;
      assert.deepEqual(renderArgs[1], {
        backUrl: `/applications/${applicationId}/overview`,
        applicationId,
        proceeding: {
          certificateType: "Substantive",
          meritsDecision: "Pending",
        },
        overallDecision: "refuse",
      });
    });
  });

  describe("processApplicationDecisionForm", () => {
    beforeEach(() => {
      requestStub.params = { applicationId };
      requestStub.body = { "overall-decision": "refuse" };
    });

    it("saves overallDecision to session", () => {
      adaptor.processApplicationDecisionForm(requestStub, responseStub);

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      const storeArgs = sessionHelperStub.storeSessionData.getCall(0).args;
      assert.deepEqual(storeArgs, [
        requestStub,
        "decision",
        { overallDecision: "refuse" },
      ]);
    });

    it("redirects to the justification page", () => {
      adaptor.processApplicationDecisionForm(requestStub, responseStub);

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/decision/justification`,
      );
    });
  });
});
