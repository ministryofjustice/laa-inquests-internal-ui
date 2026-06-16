import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { HomeAdaptor } from "#src/adaptors/presenter/home/Home.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("Home adaptor", () => {
  let homeAdaptor: HomeAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    applicationPortStub = stubInterface<ApplicationPort>();
    homeAdaptor = new HomeAdaptor(applicationPortStub);
  });

  it("renders home page with table rows from all applications", async () => {
    applicationPortStub.getAllApplications.resolves([
      {
        laaReference: 123,
        createdAt: "2026-05-20T08:46:36.793278",
        status: "LIVE",
        overallDecision: "PENDING",
      },
      {
        laaReference: 456,
        createdAt: "2026-05-21T08:46:36.793278",
        status: "LIVE",
        overallDecision: "GRANTED",
      },
      {
        laaReference: null,
        createdAt: "bad-date",
        status: null,
        overallDecision: "ASSESSMENT_COMPLETE",
      },
    ] as any);

    await homeAdaptor.renderHomePage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    const renderArgs = responseStub.render.getCall(0).args;
    assert.equal(renderArgs[0], "main/index");
    assert.deepEqual(renderArgs[1], {
      tableRows: [
        [
          {
            text: "456",
            href: "/applications/456/overview",
          },
          { text: "21 May 2026 08:46" },
          { text: "Live" },
          { text: "Granted" },
        ],
        [
          {
            text: "123",
            href: "/applications/123/overview",
          },
          { text: "20 May 2026 08:46" },
          { text: "Live" },
          { text: "Pending" },
        ],
        [
          {
            text: "null",
            href: "/applications/null/overview",
          },
          { text: "bad-date" },
          { text: "-" },
          { text: "Assessment Complete" },
        ],
      ],
    });
  });

  it("throws when applications list cannot be built", async () => {
    applicationPortStub.getAllApplications.rejects(new Error("boom"));

    await assert.rejects(
      async () => homeAdaptor.renderHomePage(requestStub, responseStub),
      {
        message: "Unable to build applications list view",
      },
    );
  });
});
