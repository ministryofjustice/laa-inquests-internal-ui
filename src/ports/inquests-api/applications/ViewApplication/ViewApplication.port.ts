import type { Application } from "#src/adaptors/models/application.types.js";

export interface ViewApplicationPort {
  getApplication: (applicationId: string) => Promise<Application>;
}
