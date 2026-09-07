import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ConfirmProfitCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.adaptor.js";
import type { ConfirmProfitCostsForm } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/models/form.types.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";

describe("ConfirmProfitCostsAdaptor", () => {
  let adaptor: ConfirmProfitCostsAdaptor;
  let requestStub: StubbedInstance<Request>;
  let responseStub: StubbedInstance<Response>;

  beforeEach(() => {
    requestStub = stubInterface<Request>();
    responseStub = stubInterface<Response>();

    adaptor = new ConfirmProfitCostsAdaptor();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("renders the confirm profit costs page with the assess claim page as the back link", async () => {
    await adaptor.renderConfirmProfitCostsPage(
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
    });
  });

  it("re-renders the confirm profit costs page when the form is submitted", async () => {
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

    await adaptor.processConfirmProfitCostsForm(requestWithBody, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.equal(
      responseStub.render.getCall(0).args[0],
      "application/claims/confirm-profit-costs/index",
    );
    assert.deepStrictEqual(responseStub.render.getCall(0).args[1], {
      backUrl: "/applications/123/claims/10",
      applicationId: "123",
      claimId: "10",
    });
  });
});
