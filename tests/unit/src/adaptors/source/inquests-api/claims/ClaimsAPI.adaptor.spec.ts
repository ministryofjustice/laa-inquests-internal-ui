import sinon from "sinon";
import { assert } from "chai";
import { ClaimsAPIAdaptor } from "#src/adaptors/source/inquests-api/claims/ClaimsAPI/ClaimsAPI.adaptor.js";
import type {
  ClaimDetail,
  ClaimSummary,
} from "#src/adaptors/models/claim.types.js";

const axiosGetStub = sinon.stub();

afterEach(() => {
  axiosGetStub.reset();
});

const expectedClaims: ClaimSummary[] = [
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

const expectedNoVatClaims: ClaimSummary[] = [
  {
    claimId: 2,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-11T13:37:56.629563",
    totalProfitCostNet: null,
    totalProfitCostGross: null,
    totalProfitCostVatZero: "800.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
  },
];

const expectedClaimDetail: ClaimDetail = {
  claimId: 10,
  claimTypeId: "PAYMENT_ON_ACCOUNT",
  submissionDate: "2026-08-11T12:52:29.677Z",
  totalProfitCostNet: "1000.00",
  totalProfitCostGross: "1200.00",
  totalProfitCostVatZero: null,
  poaTypeId: "PROFIT_COST",
  statusId: "SUBMITTED",
  claimEvidence: [
    {
      claimEvidenceId: "1",
      fileName: "claim-evidence-1.pdf",
    },
  ],
  claimDecision: {
    claimDecisionId: 99,
    decision: "REJECT",
    decisionReasons: [],
  },
};

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

  it("returns parsed claim data when only no-VAT amount is provided", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: expectedNoVatClaims });

    const claims = await adaptor.getClaims("123", false, "access-token-123");

    assert.deepEqual(claims, expectedNoVatClaims);
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

  it("calls axios with the claim detail endpoint", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: expectedClaimDetail });

    await adaptor.getClaimById("123", "10", "access-token-123");

    assert.isTrue(axiosGetStub.calledOnce);
    const [url] = axiosGetStub.getCall(0).args;
    assert.equal(url, `${baseUrl}/applications/123/claims/10`);
  });

  it("returns parsed claim detail", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: expectedClaimDetail });

    const claim = await adaptor.getClaimById("123", "10", "access-token-123");

    assert.deepEqual(claim, expectedClaimDetail);
  });

  it("throws when claim detail response fails schema validation", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({ data: { claimId: "not-a-number" } });

    let thrown: unknown;
    try {
      await adaptor.getClaimById("123", "10", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
  });

  it("calls axios with the claim evidence endpoint and disposition query param", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: Buffer.from("evidence"),
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="claim-evidence-1.pdf"',
      },
    });

    await adaptor.getClaimEvidence("1", "inline", "access-token-123");

    assert.isTrue(axiosGetStub.calledOnce);
    const [url, config] = axiosGetStub.getCall(0).args;
    assert.equal(url, `${baseUrl}/claims/1`);
    assert.deepEqual(config?.params, { disposition: "inline" });
    assert.equal(config?.responseType, "arraybuffer");
  });

  it("returns the evidence buffer with content headers", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: Buffer.from("evidence"),
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="claim-evidence-1.pdf"',
      },
    });

    const result = await adaptor.getClaimEvidence(
      "1",
      "attachment",
      "access-token-123",
    );

    assert.instanceOf(result.data, Buffer);
    assert.equal(result.data.toString(), "evidence");
    assert.equal(result.contentType, "application/pdf");
    assert.equal(
      result.contentDisposition,
      'attachment; filename="claim-evidence-1.pdf"',
    );
  });

  it("falls back to defaults when evidence content headers are missing", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: Buffer.from("evidence"),
      headers: {},
    });

    const result = await adaptor.getClaimEvidence(
      "1",
      "inline",
      "access-token-123",
    );

    assert.equal(result.contentType, "application/octet-stream");
    assert.equal(result.contentDisposition, "inline");
  });

  it("propagates errors from axios when fetching evidence", async () => {
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ClaimsAPIAdaptor(fakeAxios, baseUrl);

    axiosGetStub.rejects(new Error("network error"));

    let thrown: unknown;
    try {
      await adaptor.getClaimEvidence("1", "inline", "access-token-123");
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
    assert.equal((thrown as Error).message, "network error");
  });
});
