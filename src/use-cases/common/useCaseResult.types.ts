export const TECHNICAL_FAILURE_REASONS = {
  INVALID_INPUT_STATE: "INVALID_INPUT_STATE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNEXPECTED_EXCEPTION: "UNEXPECTED_EXCEPTION",
  UPSTREAM_REJECTED: "UPSTREAM_REJECTED",
} as const;

export type TechnicalFailureReason =
  (typeof TECHNICAL_FAILURE_REASONS)[keyof typeof TECHNICAL_FAILURE_REASONS];

export type UseCaseResult<Data = undefined, ValidationErrors = undefined> =
  | {
      status: "SUCCESS";
      data: Data;
    }
  | {
      status: "VALIDATION_FAILED";
      validationErrors: ValidationErrors;
      data?: Data;
    }
  | {
      status: "TECHNICAL_FAILURE";
      reason: TechnicalFailureReason;
      message?: string;
      cause?: unknown;
    };
