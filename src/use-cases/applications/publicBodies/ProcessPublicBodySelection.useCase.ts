import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  PublicBodyForm,
  PublicBodyFormErrors,
} from "#src/adaptors/presenter/applications/PublicBody/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessPublicBodySelectionInput {
  publicBodyOption?: string | string[];
  validate: (form: PublicBodyForm) => Partial<PublicBodyFormErrors>;
}

interface ProcessPublicBodySelectionData {
  selectedPublicBodyIds: string[];
}

export class ProcessPublicBodySelectionUseCase {
  execute(
    input: ProcessPublicBodySelectionInput,
  ): UseCaseResult<
    ProcessPublicBodySelectionData,
    Partial<PublicBodyFormErrors>
  > {
    const selectedPublicBodyIds = normaliseSelection(input.publicBodyOption);

    const validationErrors = input.validate({
      publicBodyOption: input.publicBodyOption,
    });

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data: { selectedPublicBodyIds },
      };
    }

    return {
      status: "SUCCESS",
      data: { selectedPublicBodyIds },
    };
  }
}

function normaliseSelection(
  publicBodyOption: string | string[] | undefined,
): string[] {
  if (publicBodyOption === undefined || publicBodyOption === "") {
    return [];
  }

  return Array.isArray(publicBodyOption)
    ? publicBodyOption
    : [publicBodyOption];
}
