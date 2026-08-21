import type { PublicBody } from "#src/adaptors/models/application.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface PreparePublicAuthorityFormInput {
  allPublicBodies: PublicBody[];
  currentPublicBodyIds: string[];
}

interface PreparePublicAuthorityFormData {
  items: Array<{ value: string; text: string }>;
  selectedPublicBodyIds: string[];
}

export class PreparePublicAuthorityFormUseCase {
  execute(
    input: PreparePublicAuthorityFormInput,
  ): UseCaseResult<PreparePublicAuthorityFormData> {
    const items = input.allPublicBodies.map((publicBody) => ({
      value: publicBody.publicBodyId,
      text: publicBody.publicBodyDescription,
    }));

    return {
      status: "SUCCESS",
      data: { items, selectedPublicBodyIds: input.currentPublicBodyIds },
    };
  }
}
