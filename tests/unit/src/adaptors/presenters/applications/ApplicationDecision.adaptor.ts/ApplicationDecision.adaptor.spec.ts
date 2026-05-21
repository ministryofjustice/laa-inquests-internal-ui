import { strict as assert } from "assert";
import { stubInterface, StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import type { ViewApplicationPort } from "#src/ports/inquests-api/applications/ViewApplication/ViewApplication.port.js";

describe("ApplicationDecisionAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let viewApplicationSourceStub: StubbedInstance<ViewApplicationPort>;
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
    adaptor = new ApplicationDecisionAdaptor(viewApplicationSourceStub);
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
      requestStub.session.decision = { overallDecision: "refuse" };

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
});
