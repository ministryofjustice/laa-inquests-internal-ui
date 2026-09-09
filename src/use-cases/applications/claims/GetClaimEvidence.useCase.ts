import type { Disposition } from "#src/infrastructure/locales/constants.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";

interface GetClaimEvidenceInput {
  claimEvidenceId: string;
  disposition: Disposition;
  accessToken?: string;
}

interface ClaimEvidence {
  data: Buffer;
  contentType: string;
  contentDisposition: string;
}

export type GetClaimEvidenceResult =
  | { status: "SUCCESS"; data: ClaimEvidence }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_INPUT" };

export class GetClaimEvidenceUseCase {
  constructor(private readonly claimsPort: ClaimsPort) {}

  async execute(input: GetClaimEvidenceInput): Promise<GetClaimEvidenceResult> {
    if (input.claimEvidenceId === "") return { status: "INVALID_INPUT" };
    const evidence = await this.claimsPort.getClaimEvidence(
      input.claimEvidenceId,
      input.disposition,
      input.accessToken,
    );
    return evidence === undefined
      ? { status: "NOT_FOUND" }
      : { status: "SUCCESS", data: evidence };
  }
}
