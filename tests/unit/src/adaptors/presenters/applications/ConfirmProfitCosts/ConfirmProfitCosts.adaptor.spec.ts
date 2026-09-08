import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ConfirmProfitCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.adaptor.js";
import { ConfirmProfitCostsValidator } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.validator.js";
import type { ConfirmProfitCostsForm } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/models/form.types.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

const validationErrors =
  en.pages.claimAssessment.confirmProfitCosts.validationErrors;

describe("ConfirmProfitCostsAdaptor", () => {
  let adaptor: ConfirmProfitCostsAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let validator: ConfirmProfitCostsValidator;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    sessionHelperStub = stubInterface<SessionHelper>();
    validator = new ConfirmProfitCostsValidator();

    sessionHelperStub.getSessionData.returns(null);

    adaptor = new ConfirmProfitCostsAdaptor(sessionHelperStub, validator);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders the confirm profit costs page with the assess claim page as the back link", () => {
    adaptor.renderConfirmProfitCostsPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/confirm-profit-costs/index",
    );
    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10",
      applicationId: "123",
      claimId: "10",
      netTotal: "",
      grossTotal: "",
      zeroVatTotal: "",
    });
  });

  it("pre-populates the form from session data on GET", () => {
    sessionHelperStub.getSessionData.returns({
      netTotal: "300",
      grossTotal: "360",
      zeroVatTotal: "",
    });

    adaptor.renderConfirmProfitCostsPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10",
      applicationId: "123",
      claimId: "10",
      netTotal: "300",
      grossTotal: "360",
      zeroVatTotal: "",
    });
  });

  it("re-renders the confirm profit costs page with errors and submitted values when validation fails", () => {
    const requestWithBody: TypedRequest<ConfirmProfitCostsForm, ClaimIdParams> =
      {
        ...requestStub,
        body: {
          "net-total": "",
          "gross-total": "",
          "zero-vat-total": "",
        },
        params: {
          applicationId: "123",
          claimId: "10",
        },
      };

    adaptor.processConfirmProfitCostsForm(requestWithBody, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/confirm-profit-costs/index",
    );
    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10",
      applicationId: "123",
      claimId: "10",
      netTotal: "",
      grossTotal: "",
      zeroVatTotal: "",
      errorSummaries: {
        totalRequired: { text: validationErrors.totalRequired },
      },
      errorList: [{ text: validationErrors.totalRequired, href: "#net-total" }],
    });
    assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    assert.equal(responseStub.redirect.callCount, 0);
  });

  it("shows the VAT conflict message only once in errorList when all totals conflict", () => {
    const requestWithBody: TypedRequest<ConfirmProfitCostsForm, ClaimIdParams> =
      {
        ...requestStub,
        body: {
          "net-total": "300",
          "gross-total": "360",
          "zero-vat-total": "100",
        },
        params: {
          applicationId: "123",
          claimId: "10",
        },
      };

    adaptor.processConfirmProfitCostsForm(requestWithBody, responseStub);

    const renderArgs = responseStub.render.getCall(0)
      .args[1] as unknown as Record<string, unknown>;
    assert.deepStrictEqual(renderArgs.errorSummaries, {
      netTotal: { text: validationErrors.vatConflict },
      grossTotal: { text: validationErrors.vatConflict },
      zeroVatTotal: { text: validationErrors.vatConflict },
    });
    assert.deepStrictEqual(renderArgs.errorList, [
      { text: validationErrors.vatConflict, href: "#net-total" },
    ]);
  });

  it("stores the validated totals in session and redirects when the form is valid", () => {
    const requestWithBody: TypedRequest<ConfirmProfitCostsForm, ClaimIdParams> =
      {
        ...requestStub,
        body: {
          "net-total": "300",
          "gross-total": "360",
          "zero-vat-total": "",
        },
        params: {
          applicationId: "123",
          claimId: "10",
        },
      };

    adaptor.processConfirmProfitCostsForm(requestWithBody, responseStub);

    assert.equal(responseStub.render.callCount, 0);
    assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
    assert.deepStrictEqual(sessionHelperStub.storeSessionData.getCall(0).args, [
      requestWithBody,
      "claimApproval",
      {
        netTotal: "300",
        grossTotal: "360",
        zeroVatTotal: "",
      },
    ]);
    assert.equal(responseStub.redirect.callCount, 1);
    assert.equal(
      responseStub.redirect.getCall(0).args[0],
      "/applications/123/claims/10/confirm-disbursement-costs",
    );
  });
});
