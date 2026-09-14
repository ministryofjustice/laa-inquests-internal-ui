import type { ApplicationSummary } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface BuildApplicationsListViewInput {
  accessToken?: string;
}

interface BuildApplicationsListViewData {
  applications: ApplicationSummary[];
}

export class BuildApplicationsListViewUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: BuildApplicationsListViewInput,
  ): Promise<{ status: "SUCCESS"; data: BuildApplicationsListViewData }> {
    const applications = await this.applicationPort.getAllApplications(
      input.accessToken,
    );

    return { status: "SUCCESS", data: { applications } };
  }
}
