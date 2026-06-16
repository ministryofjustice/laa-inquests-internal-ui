import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationsListViewUseCase } from "#src/use-cases/home/BuildApplicationsListView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("BuildApplicationsListViewUseCase", () => {
  const useCase = new BuildApplicationsListViewUseCase();

  it("returns SUCCESS with applications list data from the source port", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const applications = [
      {
        laaReference: 1,
        createdAt: "2026-05-18T15:49:07.455255",
        status: "LIVE",
        overallDecision: "PENDING",
      },
    ];

    applicationPortStub.getAllApplications.resolves(applications as any);

    const result = await useCase.execute({
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.applications, applications);
    assert.equal(applicationPortStub.getAllApplications.callCount, 1);
  });

  it("returns TECHNICAL_FAILURE when source retrieval fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getAllApplications.rejects(
      new Error("API Call failure"),
    );

    const result = await useCase.execute({
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
