import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ConfirmDisbursementCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.adaptor.js";
import { ConfirmDisbursementCostsValidator } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.validator.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { DisbursementCostsForm } from "#src/adaptors/presenter/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

describe("ConfirmDisbursementCostsAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let adaptor: ConfirmDisbursementCostsAdaptor;

  const applicationId = "5";
  const claimId = "10";
  const claimAssessmentPage = `/applications/${applicationId}/claims/${claimId}`;
  const validationErrors = en.pages.disbursementCosts.validationErrors;

  const validForm: DisbursementCostsForm = {
    "disbursement-cost-vat-zero": "100",
    "disbursement-cost-net": "200.50",
    "disbursement-cost-gross": "240.60",
  };

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    sessionHelperStub = stubInterface<SessionHelper>();
    adaptor = new ConfirmDisbursementCostsAdaptor(
      sessionHelperStub,
      new ConfirmDisbursementCostsValidator(),
    );
    requestStub.params = { applicationId, claimId };
  });

  describe("renderDisbursementCostsForm", () => {
    it("renders the disbursement costs view with the back url", () => {
      sessionHelperStub.getSessionData.returns(null);

      adaptor.renderDisbursementCostsForm(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      const view = responseStub.render.getCall(0).args[0];
      const data = responseStub.render.getCall(0).args[1] as unknown as Record<
        string,
        unknown
      >;
      assert.equal(view, "application/claims/disbursement-costs/index");
      assert.equal(data.backUrl, claimAssessmentPage);
      assert.equal(data.applicationId, applicationId);
      assert.equal(data.claimId, claimId);
    });

    it("renders empty fields on initial entry", () => {
      adaptor.renderDisbursementCostsForm(requestStub as Request, responseStub);

      const data = responseStub.render.getCall(0).args[1] as unknown as Record<
        string,
        unknown
      >;
      assert.equal(data.vatZero, undefined);
      assert.equal(data.net, undefined);
      assert.equal(data.gross, undefined);
    });

    it("renders the provided values when re-rendering", () => {
      adaptor.renderDisbursementCostsForm(
        requestStub as Request,
        responseStub,
        undefined,
        validForm,
      );

      const data = responseStub.render.getCall(0).args[1] as unknown as Record<
        string,
        unknown
      >;
      assert.equal(data.vatZero, "100");
      assert.equal(data.net, "200.50");
      assert.equal(data.gross, "240.60");
    });

    it("passes error summaries to the view when provided", () => {
      adaptor.renderDisbursementCostsForm(
        requestStub as Request,
        responseStub,
        {
          disbursementCostNet: { text: validationErrors.net.notEmpty },
        },
      );

      const data = responseStub.render.getCall(0).args[1] as unknown as Record<
        string,
        unknown
      >;
      assert.deepEqual(data.errorSummaries, {
        disbursementCostNet: { text: validationErrors.net.notEmpty },
      });
    });
  });

  describe("processDisbursementCostsForm", () => {
    function buildRequest(
      body: DisbursementCostsForm,
    ): TypedRequest<DisbursementCostsForm, ClaimIdParams> {
      requestStub.body = body;
      return requestStub as unknown as TypedRequest<
        DisbursementCostsForm,
        ClaimIdParams
      >;
    }

    it("stores the submitted costs in session", () => {
      sessionHelperStub.getSessionData.returns(null);

      adaptor.processDisbursementCostsForm(
        buildRequest(validForm),
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      assert.deepEqual(sessionHelperStub.storeSessionData.getCall(0).args, [
        requestStub,
        "disbursementCosts",
        validForm,
      ]);
    });

    it("redirects to the claim assessment page when costs are valid", () => {
      sessionHelperStub.getSessionData.returns(null);

      adaptor.processDisbursementCostsForm(
        buildRequest(validForm),
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        claimAssessmentPage,
      );
    });

    it("re-renders with error summaries when validation fails", () => {
      sessionHelperStub.getSessionData.returns(null);
      const renderSpy = sinon.spy(adaptor, "renderDisbursementCostsForm");

      adaptor.processDisbursementCostsForm(
        buildRequest({
          "disbursement-cost-vat-zero": "",
          "disbursement-cost-net": "",
          "disbursement-cost-gross": "",
        }),
        responseStub,
      );

      assert.equal(responseStub.redirect.callCount, 0);
      assert.equal(renderSpy.callCount, 1);
      const errorSummaries = renderSpy.getCall(0).args[2];
      assert.deepEqual(errorSummaries, {
        disbursementCostVatZero: { text: validationErrors.vatZero.notEmpty },
        disbursementCostNet: { text: validationErrors.net.notEmpty },
        disbursementCostGross: { text: validationErrors.gross.notEmpty },
      });
    });
  });
});
