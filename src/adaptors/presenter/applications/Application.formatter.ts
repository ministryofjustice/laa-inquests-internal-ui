import {
  formatAddressToHtml,
  escapeHtml,
} from "#src/utils/addressFormatter.js";
import {
  APPLICATION_TYPES,
  CATEGORIES_OF_LAW,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVELS_OF_SERVICE,
  SCOPE_OF_LIMITATIONS,
} from "#src/infrastructure/locales/constants.js";
import type {
  Application,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { formatCurrency } from "#src/utils/formatter.js";

/* eslint-disable @typescript-eslint/prefer-destructuring -- deeply nested constant */
const PROVIDER_FIRM_NAME_UNAVAILABLE_MESSAGE =
  en.pages.applicationOverview.people.provider.fallbackFirmName;
/* eslint-enable @typescript-eslint/prefer-destructuring */

export function mapCertificateTypeForDisplay(certificateType: string): string {
  return (
    (CERTIFICATE_TYPES as Record<string, string>)[certificateType] ??
    certificateType
  );
}

export function mapClientInvolvementTypeForDisplay(
  clientInvolvementType: string,
): string {
  return (
    (CLIENT_ROLES as Record<string, string>)[clientInvolvementType] ??
    clientInvolvementType
  );
}

export function mapLevelOfServiceForDisplay(levelOfService: string): string {
  return (
    (LEVELS_OF_SERVICE as Record<string, string>)[levelOfService] ??
    levelOfService
  );
}

export function mapScopeLimitationHeadingForDisplay(
  scopeLimitationHeading: string,
): string {
  return (
    (SCOPE_OF_LIMITATIONS as Record<string, string>)[scopeLimitationHeading] ??
    scopeLimitationHeading
  );
}

export function mapCategoryOfLawForDisplay(categoryOfLaw: string): string {
  return (
    (CATEGORIES_OF_LAW as Record<string, string>)[categoryOfLaw] ??
    categoryOfLaw
  );
}

export function getHomeAddressDisplay(application: Application): string {
  if (application.client.hasNoFixedAbode === true) {
    return "No fixed abode";
  }

  if (!application.client.homeAddress) {
    return "Not provided";
  }

  return formatAddressToHtml(application.client.homeAddress);
}

export function mapApplication(application: Application): Application {
  const applicationType =
    (APPLICATION_TYPES as Record<string, string>)[
      application.applicationType
    ] ?? application.applicationType;

  const provider = application.provider
    ? {
        ...application.provider,
        firmName: mapProviderFirmName(application.provider.firmName),
      }
    : null;

  return {
    ...application,
    applicationType,
    provider,
  };
}

export function mapProviderFirmName(firmName: string | null): string {
  if (!firmName || firmName.trim().length === 0) {
    return PROVIDER_FIRM_NAME_UNAVAILABLE_MESSAGE;
  }

  return firmName;
}

export function mapProceeding(proceeding: Proceeding): Omit<
  Proceeding,
  "substantiveCostLimitation"
> & {
  substantiveCostLimitation: string;
} {
  return {
    ...proceeding,
    certificateType: mapCertificateTypeForDisplay(proceeding.certificateType),
    clientInvolvementType: mapClientInvolvementTypeForDisplay(
      proceeding.clientInvolvementType,
    ),
    levelOfService: mapLevelOfServiceForDisplay(proceeding.levelOfService),
    scopeLimitationHeading: mapScopeLimitationHeadingForDisplay(
      proceeding.scopeLimitationHeading,
    ),
    substantiveCostLimitation: formatCurrency(
      proceeding.substantiveCostLimitation,
    ),
  };
}

export function getCorrespondenceDisplay(
  application: Application,
  clientHomeAddressDisplay: string,
): {
  clientCorrespondenceAddressDisplay: string;
  careOfRecipientDisplay?: string;
} {
  const careOfRecipientDisplay = application.correspondenceRecipient
    ? [
        application.correspondenceRecipient.recipientType,
        application.correspondenceRecipient.recipientName,
      ]
        .filter((line) => typeof line === "string" && line.trim().length > 0)
        .map(escapeHtml)
        .join("<br>")
    : undefined;

  if (
    application.client.correspondenceAddressSource === "USE_CLIENT_HOME_ADDRESS"
  ) {
    return {
      clientCorrespondenceAddressDisplay: clientHomeAddressDisplay,
      careOfRecipientDisplay,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_PROVIDER_ADDRESS"
  ) {
    return {
      clientCorrespondenceAddressDisplay: "Provider office address",
      careOfRecipientDisplay,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_SPECIFIED_ADDRESS"
  ) {
    if (!application.client.correspondenceAddress) {
      logger.logWarn({
        functionName: "get_correspondence_display",
        message: "Specified correspondence address missing",
        extraContext: {
          event: "correspondence_address_missing",
          laa_reference: application.laaReference,
        },
      });

      return {
        clientCorrespondenceAddressDisplay: "Not provided",
        careOfRecipientDisplay,
      };
    }

    return {
      clientCorrespondenceAddressDisplay: formatAddressToHtml(
        application.client.correspondenceAddress,
      ),
      careOfRecipientDisplay,
    };
  }

  logger.logWarn({
    functionName: "get_correspondence_display",
    message: "Unknown correspondence address source",
    extraContext: {
      event: "correspondence_address_source_unknown",
      laa_reference: application.laaReference,
      correspondence_address_source:
        application.client.correspondenceAddressSource,
    },
  });

  return {
    clientCorrespondenceAddressDisplay: application.client.correspondenceAddress
      ? formatAddressToHtml(application.client.correspondenceAddress)
      : "Not provided",
    careOfRecipientDisplay,
  };
}
