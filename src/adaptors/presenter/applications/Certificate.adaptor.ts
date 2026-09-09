import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { t } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import { HTTP_BAD_REQUEST } from "#src/infrastructure/express/constants.js";
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
    laaReference: string,
  ): Promise<void> {
    logger.logInfo({
      functionName: "render_certificate_page",
      message: "Certificate details requested",
      request: req,
      extraContext: {
        event: "certificate_page_requested",
        laa_reference: laaReference,
      },
    });

    const certificateViewResult =
      await this.buildCertificateViewUseCase.execute({
        laaReference,
        accessToken: req.session.user?.accessToken,
      });

    if (certificateViewResult.status === "NOT_FOUND") {
      logger.logWarn({
        functionName: "render_certificate_page",
        message: "Certificate not found",
        request: req,
        extraContext: {
          event: "certificate_not_found",
          laa_reference: laaReference,
          status_code: 404,
        },
      });
      res.status(404).render("application/error", {
        status: 404,
        error: t("pages.applicationCertificate.notFound"),
      });
      return;
    }

    if (certificateViewResult.status === "INVALID_INPUT") {
      logger.logWarn({
        functionName: "render_certificate_page",
        message: "Certificate request is invalid",
        request: req,
        extraContext: {
          event: "certificate_view_invalid_input",
          laa_reference: laaReference,
          status_code: HTTP_BAD_REQUEST,
        },
      });
      res.status(HTTP_BAD_REQUEST).render("application/error", {
        status: HTTP_BAD_REQUEST,
        error: t("pages.applicationCertificate.invalidRequest"),
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
      backUrl: `/applications/${laaReference}/overview`,
      certificateDetails,
    });
  }
}
