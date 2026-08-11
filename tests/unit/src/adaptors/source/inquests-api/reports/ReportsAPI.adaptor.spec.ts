import sinon from "sinon";
import { assert } from "chai";
import { ReportsAPIAdaptor } from "#src/adaptors/source/inquests-api/reports/ReportsAPI/ReportsAPI.adaptor.js";

const axiosGetStub = sinon.stub();

afterEach(() => {
  axiosGetStub.reset();
});

describe("Test Reports API Adaptor", () => {
  it("calls axios.get with correct URL and responseType arraybuffer for applications backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    await adaptor.getApplicationsBacklogReport("access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(
      axiosGetStub,
      `${baseUrl}/reports/applications/backlog`,
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: "Bearer access-token-123",
        },
      },
    );
  });

  it("returns buffer and content-type for applications backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    const result =
      await adaptor.getApplicationsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("defaults to text/csv for applications backlog when content-type header is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: {},
    });

    const result =
      await adaptor.getApplicationsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("calls axios.get with correct URL and responseType arraybuffer for claims backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    await adaptor.getClaimsBacklogReport("access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/reports/claims/backlog`, {
      responseType: "arraybuffer",
      headers: {
        Authorization: "Bearer access-token-123",
      },
    });
  });

  it("returns buffer and content-type for claims backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    const result = await adaptor.getClaimsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("defaults to text/csv for claims backlog when content-type header is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: {},
    });

    const result = await adaptor.getClaimsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });
});
