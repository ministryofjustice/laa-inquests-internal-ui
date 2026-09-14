import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationsListViewUseCase } from "#src/use-cases/home/BuildApplicationsListView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("BuildApplicationsListViewUseCase", () => {
  it("returns SUCCESS with applications list data from the source port", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new BuildApplicationsListViewUseCase(applicationPortStub);
    const applications = [
      {
        laaReference: "1",
        createdAt: "2026-05-18T15:49:07.455255",
        status: "Live",
        overallDecision: "PENDING",
      },
    ];

    applicationPortStub.getAllApplications.resolves(applications as any);

    const result = await useCase.execute({});

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.applications, applications);
    assert.equal(applicationPortStub.getAllApplications.callCount, 1);
  });

  it("propagates source retrieval errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("API Call failure");
    applicationPortStub.getAllApplications.rejects(error);
    const useCase = new BuildApplicationsListViewUseCase(applicationPortStub);

    await assert.rejects(
      useCase.execute({}),
      (thrown: unknown) => thrown === error,
    );
  });
});
