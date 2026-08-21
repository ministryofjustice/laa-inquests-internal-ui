import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  PublicAuthorityForm,
  PublicAuthorityFormErrors,
} from "#src/adaptors/presenter/applications/PublicAuthority/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessPublicAuthoritySelectionInput {
  publicAuthorityOption?: string | string[];
  validate: (form: PublicAuthorityForm) => Partial<PublicAuthorityFormErrors>;
}

interface ProcessPublicAuthoritySelectionData {
  selectedPublicAuthorityIds: string[];
}

export class ProcessPublicAuthoritySelectionUseCase {
  execute(
    input: ProcessPublicAuthoritySelectionInput,
  ): UseCaseResult<
    ProcessPublicAuthoritySelectionData,
    Partial<PublicAuthorityFormErrors>
  > {
    const selectedPublicAuthorityIds = normaliseSelection(
      input.publicAuthorityOption,
    );

    const validationErrors = input.validate({
      publicAuthorityOption: input.publicAuthorityOption,
    });

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data: { selectedPublicAuthorityIds },
      };
    }

    return {
      status: "SUCCESS",
      data: { selectedPublicAuthorityIds },
    };
  }
}

function normaliseSelection(
  publicAuthorityOption: string | string[] | undefined,
): string[] {
  if (publicAuthorityOption === undefined || publicAuthorityOption === "") {
    return [];
  }

  return Array.isArray(publicAuthorityOption)
    ? publicAuthorityOption
    : [publicAuthorityOption];
}
