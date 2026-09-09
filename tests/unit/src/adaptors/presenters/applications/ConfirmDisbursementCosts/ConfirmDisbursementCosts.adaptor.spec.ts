import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ConfirmDisbursementCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.adaptor.js";
import { ConfirmDisbursementCostsValidator } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.validator.js";
import type { ConfirmDisbursementCostsForm } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/models/form.types.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

const validationErrors =
  en.pages.claimAssessment.confirmDisbursementCosts.validationErrors;

describe("ConfirmDisbursementCostsAdaptor", () => {
  let adaptor: ConfirmDisbursementCostsAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let validator: ConfirmDisbursementCostsValidator;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();
    sessionHelperStub = stubInterface<SessionHelper>();
    validator = new ConfirmDisbursementCostsValidator();

    sessionHelperStub.getSessionData.returns(null);
    requestStub.query = {};

    adaptor = new ConfirmDisbursementCostsAdaptor(sessionHelperStub, validator);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders the confirm disbursement costs page with the confirm profit costs page as the back link", () => {
    adaptor.renderConfirmDisbursementCostsPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/confirm-disbursement-costs/index",
    );
    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10/confirm-profit-costs",
      laaReference: "123",
      claimId: "10",
      netTotal: "",
      grossTotal: "",
      zeroVatTotal: "",
    });
  });

  it("pre-populates the form from session data on GET", () => {
    sessionHelperStub.getSessionData.returns({
      disbursementNetTotal: "300",
      disbursementGrossTotal: "360",
      disbursementZeroVatTotal: "",
    });

    adaptor.renderConfirmDisbursementCostsPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10/confirm-profit-costs",
      laaReference: "123",
      claimId: "10",
      netTotal: "300",
      grossTotal: "360",
      zeroVatTotal: "",
    });
  });

  it("uses the check your answers page as the back link when arriving from check your answers", () => {
    requestStub.query = { from: "check-your-answers" };

    adaptor.renderConfirmDisbursementCostsPage(
      requestStub,
      responseStub,
      "123",
      "10",
    );

    const renderArgs = responseStub.render.getCall(0)
      .args[1] as unknown as Record<string, unknown>;
    assert.equal(
      renderArgs.backUrl,
      "/applications/123/claims/10/check-your-answers",
    );
  });

  it("re-renders the confirm disbursement costs page with errors and submitted values when validation fails", () => {
    const requestWithBody: TypedRequest<
      ConfirmDisbursementCostsForm,
      ClaimIdParams
    > = {
      ...requestStub,
      body: {
        "net-total": "",
        "gross-total": "",
        "zero-vat-total": "",
      },
      params: {
        laaReference: "123",
        claimId: "10",
      },
    };

    adaptor.processConfirmDisbursementCostsForm(requestWithBody, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/confirm-disbursement-costs/index",
    );
    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10/confirm-profit-costs",
      laaReference: "123",
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
    const requestWithBody: TypedRequest<
      ConfirmDisbursementCostsForm,
      ClaimIdParams
    > = {
      ...requestStub,
      body: {
        "net-total": "300",
        "gross-total": "360",
        "zero-vat-total": "100",
      },
      params: {
        laaReference: "123",
        claimId: "10",
      },
    };

    adaptor.processConfirmDisbursementCostsForm(requestWithBody, responseStub);

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
    assert.equal(sessionHelperStub.storeSessionData.callCount, 0);
    assert.equal(responseStub.redirect.callCount, 0);
  });

  it("stores the validated totals in session and redirects to the check your answers page when the form is valid", () => {
    const requestWithBody: TypedRequest<
      ConfirmDisbursementCostsForm,
      ClaimIdParams
    > = {
      ...requestStub,
      body: {
        "net-total": "300",
        "gross-total": "360",
        "zero-vat-total": "",
      },
      params: {
        laaReference: "123",
        claimId: "10",
      },
    };

    adaptor.processConfirmDisbursementCostsForm(requestWithBody, responseStub);

    assert.equal(responseStub.render.callCount, 0);
    assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
    assert.deepStrictEqual(sessionHelperStub.storeSessionData.getCall(0).args, [
      requestWithBody,
      "claimApproval",
      {
        disbursementNetTotal: "300",
        disbursementGrossTotal: "360",
        disbursementZeroVatTotal: "",
      },
    ]);
    assert.equal(responseStub.redirect.callCount, 1);
    assert.equal(
      responseStub.redirect.getCall(0).args[0],
      "/applications/123/claims/10/check-your-answers",
    );
  });
});
