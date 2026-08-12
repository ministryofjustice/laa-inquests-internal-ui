import {
  formatAddressToHtml,
  escapeHtml,
} from "#src/utils/addressFormatter.js";
import {
  CATEGORIES_OF_LAW,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVELS_OF_SERVICE,
  SCOPE_OF_LIMITATIONS,
} from "#src/infrastructure/locales/constants.js";
import type { Application } from "#src/adaptors/models/application.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

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
      logger.logInfo(
        "Application overview address mapping",
        `Expected specified correspondence address was missing for LAA reference ${application.laaReference}`,
      );

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

  logger.logInfo(
    "Application overview address mapping",
    `Unknown correspondenceAddressSource '${application.client.correspondenceAddressSource}' for LAA reference ${application.laaReference}`,
  );

  return {
    clientCorrespondenceAddressDisplay: application.client.correspondenceAddress
      ? formatAddressToHtml(application.client.correspondenceAddress)
      : "Not provided",
    careOfRecipientDisplay,
  };
}
