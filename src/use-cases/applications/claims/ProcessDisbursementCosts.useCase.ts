import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  DisbursementCostsForm,
  DisbursementCostsFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessDisbursementCostsInput {
  form: DisbursementCostsForm;
  validate: (
    form: DisbursementCostsForm,
  ) => Partial<DisbursementCostsFormErrors>;
}

export class ProcessDisbursementCostsUseCase {
  execute(
    input: ProcessDisbursementCostsInput,
  ): UseCaseResult<
    DisbursementCostsForm,
    Partial<DisbursementCostsFormErrors>
  > {
    const validationErrors = input.validate(input.form);

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data: input.form,
      };
    }

    return {
      status: "SUCCESS",
      data: input.form,
    };
  }
}
