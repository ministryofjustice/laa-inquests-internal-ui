import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  CertificateStartDateForm,
  CertificateStartDateFormErrors,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

interface ProcessCertificateStartDateInput {
  option: string;
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
    try {
      const {
        option,
        day: inputDay,
        month: inputMonth,
        year: inputYear,
        validate,
        existingSessionData,
      } = input;

      const validationErrors = validate({
        "start-date-option": option,
        "start-date-day": inputDay,
        "start-date-month": inputMonth,
        "start-date-year": inputYear,
      });

      let day = inputDay;
      let month = inputMonth;
      let year = inputYear;

      if (option === "today") {
        const today = new Date();
        day = String(today.getDate());
        month = String(today.getMonth() + 1); //TODO: Is there a constant defined for the offset already?
        year = String(today.getFullYear());
      }

      const mergedDecisionData: DecisionSessionData = {
        ...(existingSessionData ?? {}),
        certificateStartDateOption: option,
        certificateStartDateDay: day,
        certificateStartDateMonth: month,
        certificateStartDateYear: year,
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
    } catch (cause) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UNEXPECTED_EXCEPTION,
        cause,
      };
    }
  }
}
