import type {
  Application,
  ApplicationSummary,
} from "#src/adaptors/models/application.types.js";

//TODO: Rename this interface as it's only used for refusal decisions
export interface SubmitMeritsDecisionOptions {
  refusalReason?: string;
  justification?: string;
}

export interface ApplicationPort {
  getAllApplications: () => Promise<ApplicationSummary[]>;
  getApplication: (applicationId: string) => Promise<Application>;
  submitMeritsDecision: (
    applicationId: string,
    meritsDecision: string,
    options?: SubmitMeritsDecisionOptions,
  ) => Promise<void>;
}
