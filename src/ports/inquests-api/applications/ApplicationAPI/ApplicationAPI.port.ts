import type { Application } from "#src/adaptors/models/application.types.js";

export interface ApplicationPort {
  getApplication: (applicationId: string) => Promise<Application>;
  submitMeritsDecision: (
    applicationId: string,
    meritsDecision: string,
  ) => Promise<void>;
}
