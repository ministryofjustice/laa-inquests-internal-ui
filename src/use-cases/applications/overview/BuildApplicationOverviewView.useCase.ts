import type {
  Application,
  Proceeding,
} from "#src/adaptors/models/application.types.js";
import { formatCurrency } from "#src/utils/formatter.js";
import {
  APPLICATION_TYPES,
  CERTIFICATE_TYPES,
  CLIENT_ROLES,
  LEVEL_OF_SERVICE,
  SCOPE_OF_LIMITATION,
} from "#src/infrastructure/locales/constants.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface BuildApplicationOverviewViewData {
  application: Application;
  proceedings: Array<
    Omit<Proceeding, "substantiveCostLimitation"> & {
      substantiveCostLimitation: string;
    }
  >;
  clientHomeAddressDisplay: string;
  clientCorrespondenceAddressDisplay: string;
  careOfRecipientDisplay?: string;
  statusTag: {
    text: string;
    classes: string;
  };
  warnings: string[];
}

export class BuildApplicationOverviewViewUseCase {
  execute(
    application: Application,
  ): UseCaseResult<BuildApplicationOverviewViewData> {
    const proceedings = mapProceedings(application.proceedings);
    const clientHomeAddressDisplay = getHomeAddressDisplay(application);
    const {
      clientCorrespondenceAddressDisplay,
      careOfRecipientDisplay,
      warnings,
    } = getCorrespondenceDisplay(application);

    const applicationType =
      APPLICATION_TYPES.find(
        (t) => t.applicationTypeId === application.applicationType,
      )?.applicationTypeDescription ?? application.applicationType;

    const mappedApplication: Application = {
      ...application,
      applicationType,
    };

    // COPILOT TODO: Any presentation logic should be in the presenter
    const isPending =
      !application.overallDecision ||
      application.overallDecision.toUpperCase() === "PENDING";

    // COPILOT TODO: Any presentation logic should be in the presenter
    const statusTag = isPending
      ? { text: "Awaiting assessment", classes: "govuk-tag--grey" }
      : { text: "Assessment complete", classes: "govuk-tag--green" };

    return {
      status: "SUCCESS",
      data: {
        application: mappedApplication,
        proceedings,
        clientHomeAddressDisplay,
        clientCorrespondenceAddressDisplay,
        careOfRecipientDisplay,
        statusTag,
        warnings,
      },
    };
  }
}

// COPILOT TODO: Any presentation logic should be in the presenter
function getHomeAddressDisplay(application: Application): string {
  if (application.client.hasNoFixedAbode === true) {
    return "No fixed abode";
  }

  if (!application.client.homeAddress) {
    return "Not provided";
  }

  return addressToHtml(application.client.homeAddress);
}

// COPILOT TODO: Any presentation logic should be in the presenter
function getCorrespondenceDisplay(application: Application): {
  clientCorrespondenceAddressDisplay: string;
  careOfRecipientDisplay?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

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
      clientCorrespondenceAddressDisplay: getHomeAddressDisplay(application),
      careOfRecipientDisplay,
      warnings,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_PROVIDER_ADDRESS"
  ) {
    return {
      clientCorrespondenceAddressDisplay: "Provider office address",
      careOfRecipientDisplay,
      warnings,
    };
  }

  if (
    application.client.correspondenceAddressSource === "USE_SPECIFIED_ADDRESS"
  ) {
    if (!application.client.correspondenceAddress) {
      warnings.push(
        `Expected specified correspondence address was missing for LAA reference ${application.laaReference}`,
      );

      return {
        clientCorrespondenceAddressDisplay: "Not provided",
        careOfRecipientDisplay,
        warnings,
      };
    }

    return {
      clientCorrespondenceAddressDisplay: addressToHtml(
        application.client.correspondenceAddress,
      ),
      careOfRecipientDisplay,
      warnings,
    };
  }

  warnings.push(
    `Unknown correspondenceAddressSource '${application.client.correspondenceAddressSource}' for LAA reference ${application.laaReference}`,
  );

  return {
    clientCorrespondenceAddressDisplay: application.client.correspondenceAddress
      ? addressToHtml(application.client.correspondenceAddress)
      : "Not provided",
    careOfRecipientDisplay,
    warnings,
  };
}

// COPILOT TODO: Any presentation logic should be in the presenter
function addressToHtml(address: {
  addressLine1: string;
  addressLine2?: string | null;
  townOrCity: string;
  county?: string | null;
  postcode: string;
}): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postcode,
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .map(escapeHtml)
    .join("<br>");
}

// COPILOT TODO: Any presentation logic should be in the presenter
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// COPILOT TODO: Any presentation logic should be in the presenter
function mapProceedings(proceedings: Proceeding[]): Array<
  Omit<Proceeding, "substantiveCostLimitation"> & {
    substantiveCostLimitation: string;
  }
> {
  return proceedings.map((p) => ({
    ...p,
    certificateType:
      CERTIFICATE_TYPES.find((t) => t.certificateTypeId === p.certificateType)
        ?.certificateTypeDescription ?? p.certificateType,
    clientInvolvementType:
      CLIENT_ROLES.find((t) => t.clientRoleId === p.clientInvolvementType)
        ?.clientRoleDescription ?? p.clientInvolvementType,
    levelOfService:
      LEVEL_OF_SERVICE.find((t) => t.levelOfServiceId === p.levelOfService)
        ?.levelOfServiceDescription ?? p.levelOfService,
    scopeLimitationHeading:
      SCOPE_OF_LIMITATION.find(
        (t) => t.scopeOfLimitationId === p.scopeLimitationHeading,
      )?.lscopeOfLimitationDescription ?? p.scopeLimitationHeading,
    substantiveCostLimitation: formatCurrency(p.substantiveCostLimitation),
  }));
}
