import sinon from "sinon";
import axios from "axios";
import { assert } from "chai";
import { ApplicationDataStoreAdaptor } from "#src/adaptors/dataStoreApplicationAdaptor.js";
import { Application } from "#src/adaptors/models/application.types.js";

const axiosGetStub = sinon.stub(axios, "get");

afterEach(() => {
  axiosGetStub.reset();
});

describe("Test Application API Adaptor", () => {
  it("Test get Applications calls axios", async () => {
    const baseUrl = "https://www.gov.uk";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationDataStoreAdaptor(fakeAxios, baseUrl);
    const expectedApplication = {
      id: "123",
      status: "Open",
      provider: "Test Provider",
      date_submitted: "13/04/2026",
    };
    axiosGetStub.resolves({
      data: expectedApplication,
    });
    await adaptor.getApplication("123");
    assert(axiosGetStub.calledOnce);
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/cases/123`);

    await adaptor.getApplication("234");
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/cases/234`);
  });
  it("Test get Applications calls returns application data", async () => {
    const baseUrl = "https://www.gov.uk";
    const expectedApplication = {
      id: "123",
      status: "Open",
      provider: "Test Provider",
      date_submitted: "13/04/2026",
    };
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ApplicationDataStoreAdaptor(fakeAxios, baseUrl);

    axiosGetStub.resolves({
      data: expectedApplication,
    });

    const application: Application = await adaptor.getApplication("123");
    assert.deepEqual(expectedApplication, application);
  });
});
