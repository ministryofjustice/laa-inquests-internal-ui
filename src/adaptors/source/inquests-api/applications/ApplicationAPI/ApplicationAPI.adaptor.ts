import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  Application,
  ApplicationSummary,
  RefusalReason,
} from "../../../../models/application.types.js";
import {
  ApplicationSchema,
  ApplicationSummarySchema,
} from "../../../../models/application.schema.js";
import { REFUSAL_REASON_MAP } from "../../../../models/application.types.js";
import type { SubmitMeritsDecisionOptions } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

export class ApplicationAPIAdaptor {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getAllApplications(): Promise<ApplicationSummary[]> {
    const {
      data,
    }: AxiosResponse<
      Array<{
        laa_reference: number | null;
        created_at: string;
        status: string | null;
        overall_decision: string | null;
      }>
    > = await this.http.get(`${this.baseUrl}/applications/`);
    return data
      .map((application) => ({
        laaReference: application.laa_reference,
        createdAt: application.created_at,
        status: application.status,
        overallDecision: application.overall_decision,
      }))
      .map((application) => ApplicationSummarySchema.parse(application));
  }

  async getApplication(applicationId: string): Promise<Application> {
    const { data }: AxiosResponse<Application> = await this.http.get(
      `${this.baseUrl}/applications/${applicationId}`,
    );
    return ApplicationSchema.parse(data);
  }

  async submitMeritsDecision(
    applicationId: string,
    meritsDecision: string,
    options?: SubmitMeritsDecisionOptions,
  ): Promise<void> {
    const payload: {
      meritsDecision: string;
      refusalReason?: RefusalReason;
      justification?: string;
    } = {
      meritsDecision,
      ...(meritsDecision === "REFUSED" && options
        ? {
            ...(options.refusalReason && {
              refusalReason: REFUSAL_REASON_MAP[options.refusalReason],
            }),
            ...(options.justification && {
              justification: options.justification,
            }),
          }
        : {}),
    };

    await this.http.patch(
      `${this.baseUrl}/applications/${applicationId}/merits-decision`,
      payload,
    );
  }
}
