import type { Application } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface BuildApplicationOverviewViewInput {
  laaReference: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

interface BuildApplicationOverviewViewData {
  application: Application;
}

export type BuildApplicationOverviewViewResult =
  | { status: "SUCCESS"; data: BuildApplicationOverviewViewData }
  | { status: "INVALID_INPUT" };

export class BuildApplicationOverviewViewUseCase {
  async execute(
    input: BuildApplicationOverviewViewInput,
  ): Promise<BuildApplicationOverviewViewResult> {
    if (!input.laaReference) {
      return { status: "INVALID_INPUT" };
    }

    const application = await input.applicationPort.getApplication(
      input.laaReference,
      input.accessToken,
    );

    return {
      status: "SUCCESS",
      data: { application },
    };
  }
}
