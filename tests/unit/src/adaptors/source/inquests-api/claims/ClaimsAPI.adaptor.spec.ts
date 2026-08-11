import sinon from "sinon";
import axios from "axios";
import { assert } from "chai";
import { ClaimsAPIAdaptor } from "#src/adaptors/source/inquests-api/claims/ClaimsAPI/ClaimsAPI.adaptor.js";
import type { Claim } from "#src/adaptors/models/claim.types.js";

const axiosGetStub = sinon.stub(axios, "get");

afterEach(() => {
  axiosGetStub.reset();
});

const expectedClaims: Claim[] = [
  {
    claimId: 1,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-10T13:37:56.629563",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "PAY_IN_FULL",
    claimDecisionStatus: "PAY_IN_FULL",
  },
];

describe("Test Claims API Adaptor", () => {
  const baseUrl = "https://localhost";

  it("calls axios with the claims endpoint and assessed query param", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: expectedClaims });

    await adaptor.getClaims("123", true, "access-token-123");

    assert.isTrue(axiosGetStub.calledOnce);
    const [url, config] = axiosGetStub.getCall(0).args;
    assert.equal(url, `${baseUrl}/applications/123/claims`);
    assert.deepEqual(config?.params, { assessed: true });
  });

  it("passes assessed=false through to axios", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: [] });

    await adaptor.getClaims("123", false, "access-token-123");

    const [, config] = axiosGetStub.getCall(0).args;
    assert.deepEqual(config?.params, { assessed: false });
  });

  it("returns parsed claim data", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: expectedClaims });

    const claims = await adaptor.getClaims("123", true, "access-token-123");

    assert.deepEqual(claims, expectedClaims);
  });

  it("throws when the response fails schema validation", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: [{ claimId: "not-a-number" }] });

    let thrown: unknown;
    try {
      await adaptor.getClaims("123", true, "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
  });

  it("propagates errors from axios", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.rejects(new Error("network error"));

    let thrown: unknown;
    try {
      await adaptor.getClaims("123", true, "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
    assert.equal((thrown as Error).message, "network error");
  });
});
