import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type { Application } from "../../../../models/application.types.js";
import { ApplicationSchema } from "../../../../models/application.schema.js";

export class ApplicationAPIAdaptor {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

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
