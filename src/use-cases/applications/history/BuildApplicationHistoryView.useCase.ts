import type { HistoryEvent } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface BuildApplicationHistoryViewInput {
  laaReference: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

interface BuildApplicationHistoryViewData {
  history: HistoryEvent[];
}

export type BuildApplicationHistoryViewResult =
  | { status: "SUCCESS"; data: BuildApplicationHistoryViewData }
  | { status: "INVALID_INPUT" };

export class BuildApplicationHistoryViewUseCase {
  async execute(
    input: BuildApplicationHistoryViewInput,
  ): Promise<BuildApplicationHistoryViewResult> {
    if (!input.laaReference) {
      return { status: "INVALID_INPUT" };
    }

    const history = await input.applicationPort.getApplicationHistory(
      input.laaReference,
      input.accessToken,
    );

    return {
      status: "SUCCESS",
      data: {
        history,
      },
    };
  }
}
