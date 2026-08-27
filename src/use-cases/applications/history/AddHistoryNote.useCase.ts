import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface AddHistoryNoteInput {
  applicationId: string;
  noteText: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

export class AddHistoryNoteUseCase {
  async execute(input: AddHistoryNoteInput): Promise<UseCaseResult> {
    if (!input.applicationId) {
      logger.logWarn({
        functionName: "add_history_note_use_case",
        message: "Add history note request is invalid",
        extraContext: {
          event: "add_history_note_invalid_input",
          laa_reference: input.applicationId,
          reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot add a history note without an applicationId",
      };
    }

    try {
      await input.applicationPort.addHistoryNote(
        input.applicationId,
        input.accessToken,
        input.noteText,
      );

      logger.logInfo({
        functionName: "add_history_note_use_case",
        message: "History note added",
        extraContext: {
          event: "history_note_added",
          laa_reference: input.applicationId,
        },
      });

      return {
        status: "SUCCESS",
        data: undefined,
      };
    } catch (error) {
      logger.logError({
        functionName: "add_history_note_use_case",
        message: "Add history note failed",
        err: error,
        extraContext: {
          event: "add_history_note_upstream_failed",
          laa_reference: input.applicationId,
          reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        cause: error,
      };
    }
  }
}
