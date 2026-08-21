import type { Certificate } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface BuildCertificateViewInput {
  applicationId: string;
  accessToken?: string;
}

export class BuildCertificateViewUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: BuildCertificateViewInput,
  ): Promise<UseCaseResult<Certificate>> {
    if (!input.applicationId) {
      logger.logWarn({
        functionName: "build_certificate_view_use_case",
        message: "Certificate view request is invalid",
        extraContext: {
          event: "certificate_view_invalid_input",
          laa_reference: input.applicationId,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot build certificate view without an applicationId",
      };
    }

    try {
      const certificateResult =
        await this.applicationPort.getCertificateDetails(
          input.applicationId,
          input.accessToken,
        );

      if (certificateResult.status === "FAILURE") {
        if (
          certificateResult.reason ===
          TECHNICAL_FAILURE_REASONS.RESOURCE_NOT_FOUND
        ) {
          logger.logWarn({
            functionName: "build_certificate_view_use_case",
            message: "Certificate not found",
            extraContext: {
              event: "certificate_not_found",
              laa_reference: input.applicationId,
            },
          });
        } else {
          logger.logError({
            functionName: "build_certificate_view_use_case",
            message: "Certificate retrieval failed",
            err: certificateResult.cause,
            extraContext: {
              event: "certificate_retrieval_failed",
              laa_reference: input.applicationId,
              failure_reason: certificateResult.reason,
            },
          });
        }

        return {
          status: "TECHNICAL_FAILURE",
          reason: certificateResult.reason,
          message: certificateResult.message,
          cause: certificateResult.cause,
        };
      }

      return {
        status: "SUCCESS",
        data: certificateResult.data,
      };
    } catch (error) {
      logger.logError({
        functionName: "build_certificate_view_use_case",
        message: "Unexpected certificate view failure",
        err: error,
        extraContext: {
          event: "certificate_view_unexpected_failure",
          laa_reference: input.applicationId,
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
