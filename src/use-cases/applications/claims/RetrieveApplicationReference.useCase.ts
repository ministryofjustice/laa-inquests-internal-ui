import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

export interface RetrieveApplicationReferenceInput {
  claimReference: string;
  accessToken?: string;
}

export type RetrieveApplicationReferenceResult =
  { status: "SUCCESS"; laaReference: string } | { status: "NOT_FOUND" };

export class RetrieveApplicationReferenceUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(
    input: RetrieveApplicationReferenceInput,
  ): Promise<RetrieveApplicationReferenceResult> {
    const laaReference =
      await this.claimsPort.getApplicationReferenceByClaimReference(
        input.claimReference,
        input.accessToken,
      );

    if (laaReference === undefined) {
      return { status: "NOT_FOUND" };
    }

    return { status: "SUCCESS", laaReference };
  }
}
