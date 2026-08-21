import type { PublicBody } from "#src/adaptors/models/application.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface PreparePublicBodyFormInput {
  allPublicBodies: PublicBody[];
  currentPublicBodyIds: string[];
}

interface PreparePublicBodyFormData {
  items: Array<{ value: string; text: string }>;
  selectedPublicBodyIds: string[];
}

export class PreparePublicBodyFormUseCase {
  execute(
    input: PreparePublicBodyFormInput,
  ): UseCaseResult<PreparePublicBodyFormData> {
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
