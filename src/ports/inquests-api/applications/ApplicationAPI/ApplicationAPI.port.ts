import type {
  Application,
  ApplicationSummary,
} from "#src/adaptors/models/application.types.js";

export interface SubmitMeritsDecisionRefusalOptions {
  refusalReason?: string;
  justification?: string;
}

export interface ApplicationPort {
  getAllApplications: () => Promise<ApplicationSummary[]>;
  getApplication: (applicationId: string) => Promise<Application>;
  submitMeritsDecision: (
    applicationId: string,
    meritsDecision: string,
    options?: SubmitMeritsDecisionRefusalOptions,
  ) => Promise<void>;
  getCoronersLetterDocument: (
    applicationId: string,
  ) => Promise<{ data: Buffer; contentType: string }>;
}
