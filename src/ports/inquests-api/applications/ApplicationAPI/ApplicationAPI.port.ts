import type {
  Application,
  ApplicationSummary,
} from "#src/adaptors/models/application.types.js";

export interface SubmitMeritsDecisionRefusalOptions {
  refusalReason?: string;
  justification?: string;
}

export interface ApplicationPort {
  getAllApplications: (
    accessToken: string | undefined,
  ) => Promise<ApplicationSummary[]>;
  getApplication: (
    applicationId: string,
    accessToken: string | undefined,
  ) => Promise<Application>;
  submitMeritsDecision: (
    applicationId: string,
    meritsDecision: string,
    accessToken?: string,
    options?: SubmitMeritsDecisionRefusalOptions,
  ) => Promise<void>;
}
