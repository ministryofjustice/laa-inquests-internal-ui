import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  Application,
  ApplicationSummary,
} from "../../../../models/application.types.js";
import {
  ApplicationSchema,
  ApplicationSummarySchema,
} from "../../../../models/application.schema.js";

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
  ): Promise<void> {
    await this.http.patch(
      `${this.baseUrl}/applications/${applicationId}/merits-decision`,
      { meritsDecision },
    );
  }
}
