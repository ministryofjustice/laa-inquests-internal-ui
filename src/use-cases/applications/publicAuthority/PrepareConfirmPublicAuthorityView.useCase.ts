import type { PublicBody } from "#src/adaptors/models/application.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface PrepareConfirmPublicAuthorityViewInput {
  selectedPublicAuthorityIds: string[];
  allPublicBodies: PublicBody[];
}

interface PrepareConfirmPublicAuthorityViewData {
  selectedPublicAuthorities: Array<{ id: string; description: string }>;
}

export class PrepareConfirmPublicAuthorityViewUseCase {
  execute(
    input: PrepareConfirmPublicAuthorityViewInput,
  ): UseCaseResult<PrepareConfirmPublicAuthorityViewData> {
    const selectedPublicAuthorities = input.allPublicBodies
      .filter((body) =>
        input.selectedPublicAuthorityIds.includes(body.publicBodyId),
      )
      .map((body) => ({
        id: body.publicBodyId,
        description: body.publicBodyDescription,
      }));

    return {
      status: "SUCCESS",
      data: { selectedPublicAuthorities },
    };
  }
}
