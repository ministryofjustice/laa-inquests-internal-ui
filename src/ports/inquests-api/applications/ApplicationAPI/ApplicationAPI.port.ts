import type {
  Application,
  ApplicationSummary,
  Certificate,
  HistoryEvent,
} from "#src/adaptors/models/application.types.js";
import type { OutboundAdapterResult } from "#src/ports/common/outboundAdapterResult.types.js";

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
  getCertificateDetails: (
    applicationId: string,
    accessToken: string | undefined,
  ) => Promise<OutboundAdapterResult<Certificate>>;
  getApplicationHistory: (
    applicationId: string,
    accessToken: string | undefined,
  ) => Promise<HistoryEvent[]>;
}
