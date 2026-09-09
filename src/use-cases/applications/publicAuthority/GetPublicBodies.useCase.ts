import type { PublicBody } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

export class GetPublicBodiesUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(accessToken?: string): Promise<PublicBody[]> {
    return await this.applicationPort.getPublicBodies(accessToken);
  }
}
