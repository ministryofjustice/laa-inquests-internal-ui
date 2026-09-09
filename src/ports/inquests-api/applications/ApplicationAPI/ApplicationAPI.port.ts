import type {
  Application,
  ApplicationSummary,
  Certificate,
  HistoryEvent,
  PublicBody,
} from "#src/adaptors/models/application.types.js";

export interface ApplicationPort {
  getAllApplications: (
    accessToken: string | undefined,
  ) => Promise<ApplicationSummary[]>;
  getApplication: (
    laaReference: string,
    accessToken: string | undefined,
  ) => Promise<Application>;
  submitRefuseDecision: (
    laaReference: string,
    accessToken: string | undefined,
    refusalReason: string,
    justification: string,
  ) => Promise<void>;
  submitGrantDecision: (
    laaReference: string,
    accessToken: string | undefined,
    certificateStartDate: string,
  ) => Promise<void>;
  getCoronersLetterDocument: (
    laaReference: string,
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string } | undefined>;
  getCertificateDetails: (
    laaReference: string,
    accessToken: string | undefined,
  ) => Promise<Certificate | undefined>;
  getApplicationHistory: (
    laaReference: string,
    accessToken: string | undefined,
  ) => Promise<HistoryEvent[]>;
  getPublicBodies: (accessToken: string | undefined) => Promise<PublicBody[]>;
  updateApplicationPublicBodies: (
    laaReference: string,
    accessToken: string | undefined,
    publicBodyIds: string[],
  ) => Promise<void>;
  addHistoryNote: (
    laaReference: string,
    accessToken: string | undefined,
    noteText: string,
  ) => Promise<void>;
}
