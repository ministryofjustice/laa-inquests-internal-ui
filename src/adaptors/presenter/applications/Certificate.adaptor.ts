import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import type { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { formatDate } from "#src/utils/dateFormatter.js";
import {
  escapeHtml,
  formatAddressToHtml,
} from "#src/utils/addressFormatter.js";
import {
  mapCertificateTypeForDisplay,
  mapLevelOfServiceForDisplay,
  mapScopeLimitationHeadingForDisplay,
  mapCategoryOfLawForDisplay,
} from "#src/adaptors/presenter/applications/Application.formatter.js";

export class CertificateAdaptor {
  private readonly buildCertificateViewUseCase: BuildCertificateViewUseCase;
  constructor(buildCertificateViewUseCase: BuildCertificateViewUseCase) {
    this.buildCertificateViewUseCase = buildCertificateViewUseCase;
  }

  async renderCertificatePage(
    req: Request,
    res: Response,
    applicationId: string,
  ): Promise<void> {
    logger.logInfo(
      "GET Certificate Page",
      `Certificate details for application ${applicationId} requested.`,
      req,
    );

    const certificateViewResult =
      await this.buildCertificateViewUseCase.execute({
        applicationId,
        accessToken: req.session.user?.accessToken,
      });

    if (certificateViewResult.status !== "SUCCESS") {
      logger.logError(
        "GET Certificate Page",
        `Failed to build certificate view for application ${applicationId}`,
        certificateViewResult.status === "TECHNICAL_FAILURE"
          ? (certificateViewResult.cause ?? certificateViewResult.message)
          : undefined,
        req,
      );

      if (
        certificateViewResult.status === "TECHNICAL_FAILURE" &&
        certificateViewResult.reason ===
          TECHNICAL_FAILURE_REASONS.RESOURCE_NOT_FOUND
      ) {
        res.status(404).render("application/error", {
          status: 404,
          error: "The certificate for this application could not be found.",
        });
        return;
      }

      res.status(500).render("application/error", {
        status: "Unable to retrieve certificate",
        error: "Unable to retrieve certificate. Please try again later",
      });
      return;
    }
    const { data } = certificateViewResult;

    const certificateDetails = {
      ...data,
      clientAddress: formatAddressToHtml(data.clientAddress),
      officeAddress: formatAddressToHtml(data.officeAddress),
      opponentDetails: (data.opponentDetails ?? [])
        .map(escapeHtml)
        .join("<br>"),
      dateCreated: formatDate(data.dateCreated),
      effectiveDate: formatDate(data.effectiveDate),
      endDate: formatDate(data.endDate),
      dateWorkCanCommence: formatDate(data.dateWorkCanCommence),
      dateCurrentLevelOfServiceEffective: formatDate(
        data.dateCurrentLevelOfServiceEffective,
      ),
      costLimitation: formatCurrency(data.costLimitation),
      costLimitationEffectiveDate: formatDate(data.costLimitationEffectiveDate),
      certificateType: mapCertificateTypeForDisplay(data.certificateType),
      categoryOfLaw: mapCategoryOfLawForDisplay(data.categoryOfLaw),
      levelOfService: mapLevelOfServiceForDisplay(data.levelOfService),
      scopeLimitationHeading: mapScopeLimitationHeadingForDisplay(
        data.scopeLimitationHeading,
      ),
    };

    res.render("application/certificate", {
      backUrl: `/applications/${applicationId}/overview`,
      certificateDetails,
    });
  }
}
