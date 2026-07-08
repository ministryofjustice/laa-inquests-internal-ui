import type {
  Application,
  ApplicationSummary,
} from "#src/adaptors/models/application.types.js";

export interface ApplicationPort {
  getAllApplications: (
    accessToken: string | undefined,
  ) => Promise<ApplicationSummary[]>;
  getApplication: (
    applicationId: string,
    accessToken: string | undefined,
  ) => Promise<Application>;
  submitRefuseDecision: (
    applicationId: string,
    accessToken: string | undefined,
    refusalReason: string,
    justification: string,
  ) => Promise<void>;
  submitGrantDecision: (
    applicationId: string,
    accessToken: string | undefined,
    certificateStartDate: string,
  ) => Promise<void>;
  getCoronersLetterDocument: (
    applicationId: string,
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
}
