import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  CertificateStartDateForm,
  CertificateStartDateFormErrors,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

interface ProcessCertificateStartDateInput {
  day: string;
  month: string;
  year: string;
  validate: (
    form: CertificateStartDateForm,
  ) => Partial<CertificateStartDateFormErrors>;
  existingSessionData?: DecisionSessionData | null;
}

export class ProcessCertificateStartDateUseCase {
  execute(
    input: ProcessCertificateStartDateInput,
  ): UseCaseResult<
    DecisionSessionData,
    Partial<CertificateStartDateFormErrors>
  > {
    const validationErrors = input.validate({
      "start-date-day": input.day,
      "start-date-month": input.month,
      "start-date-year": input.year,
    });

    const mergedDecisionData: DecisionSessionData = {
      ...(input.existingSessionData ?? {}),
      certificateStartDateDay: input.day,
      certificateStartDateMonth: input.month,
      certificateStartDateYear: input.year,
    };

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data: mergedDecisionData,
      };
    }

    return {
      status: "SUCCESS",
      data: mergedDecisionData,
    };
  }
}
