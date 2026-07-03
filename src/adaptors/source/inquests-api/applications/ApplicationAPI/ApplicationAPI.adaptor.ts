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
import type { SubmitMeritsDecisionRefusalOptions } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  patchInquestsApi,
  getInquestsApi,
} from "#src/adaptors/source/inquests-api/utils.js";

export class ApplicationAPIAdaptor {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getAllApplications(
    accessToken: string | undefined,
  ): Promise<ApplicationSummary[]> {
    const {
      data,
    }: AxiosResponse<
      Array<{
        laa_reference: number | null;
        created_at: string;
        status: string | null;
        overall_decision: string | null;
      }>
    > = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: "/applications/",
      accessToken,
    });
    return data
      .map((application) => ({
        laaReference: application.laa_reference,
        createdAt: application.created_at,
        status: application.status,
        overallDecision: application.overall_decision,
      }))
      .map((application) => ApplicationSummarySchema.parse(application));
  }

  async getApplication(
    applicationId: string,
    accessToken: string | undefined,
  ): Promise<Application> {
    const { data }: AxiosResponse<Application> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}`,
      accessToken,
    });
    return ApplicationSchema.parse(data);
  }

  async submitMeritsDecision(
    applicationId: string,
    meritsDecision: string,
    accessToken: string | undefined,
    options?: SubmitMeritsDecisionRefusalOptions,
  ): Promise<void> {
    const payload: {
      meritsDecision: string;
      reasonForRefusal?: RefusalReason;
      justification?: string;
    } = {
      meritsDecision,
      ...(meritsDecision === "REFUSED" && options
        ? {
            ...(options.refusalReason && {
              reasonForRefusal: REFUSAL_REASON_MAP[options.refusalReason],
            }),
            ...(options.justification && {
              justification: options.justification,
            }),
          }
        : {}),
    };

    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/merits-decision`,
      body: payload,
      accessToken,
    });
  }
}
