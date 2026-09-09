import type { Application } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

export class GetApplicationUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    laaReference: string,
    accessToken?: string,
  ): Promise<Application> {
    return await this.applicationPort.getApplication(laaReference, accessToken);
  }
}
