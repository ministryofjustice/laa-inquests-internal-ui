import { escapeHtml } from "#src/utils/addressFormatter.js";
import { HISTORY_EVENT_REFERENCE } from "#src/infrastructure/locales/constants.js";
import { formatDateTime } from "#src/utils/dateFormatter.js";
import type { HistoryEvent } from "#src/adaptors/models/application.types.js";

/**
 * Type definition for event formatter functions.
 * Event formatters take optional eventData and return a formatted description string.
 */
export type EventFormatter = (
  eventData?: Record<string, unknown> | null,
) => string;

/**
 * Registry of history event formatters.
 * Each event reference maps to a formatter function that returns the event description.
 * Dynamic events extract and interpolate data from eventData; static events return fixed strings.
 *
 * To add a new event formatter:
 * 1. Add the event reference from HISTORY_EVENT_REFERENCE as a key
 * 2. Return a static string for simple events
 * 3. For dynamic events, extract and format fields from eventData, then interpolate into the description
 */
export const HISTORY_EVENT_FORMATTERS: Partial<Record<string, EventFormatter>> =
  {
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_001]: () => "Application received",
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_002]: (eventData) => {
      const decision = escapeHtmlValue(eventData?.meritsDecision);
      let html = `Application ${decision}`;
      if (decision === "Refused") {
        const formattedRefusalReason = formatEnum(
          escapeHtmlValue(eventData?.refusalReason),
        );
        const formattedRefusalJustification = escapeHtmlValue(
          eventData?.refusalJustification,
        );
        html += `<br /> ${formattedRefusalReason} <br /> ${formattedRefusalJustification}`;
      }

      return html;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_003]: (eventData) => {
      const laaReference = escapeHtmlValue(eventData?.laaReference);
      return `Certificate created <br /> <a href="/applications/${laaReference}/certificate">View certificate</a>`;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_004]: () =>
      "Interested parties updated",

    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001]: (eventData) => {
      const claimType = formatEnum(escapeHtmlValue(eventData?.claimType));
      return `${claimType} claim received`;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_002]: (eventData) => {
      const claimType = formatEnum(escapeHtmlValue(eventData?.claimType));
      const decision = escapeHtmlValue(eventData?.claimDecision);
      return `${claimType} claim ${decision}`;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003]: (eventData) => {
      const claimReference = escapeHtmlValue(eventData?.claimReference);
      return `POA claim ${claimReference} auto-approved`;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_004]: (eventData) => {
      const claimReference = escapeHtmlValue(eventData?.claimReference);
      return `POA claim ${claimReference} auto-rejected`;
    },

    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_001]: () =>
      "Application submission confirmation sent",
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_002]: () =>
      "Application granted email sent",
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_003]: () =>
      "Application granted letter sent",
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_004]: () =>
      "Application refused email sent",

    [HISTORY_EVENT_REFERENCE.EVT_COM_CLM_001]: () =>
      "Claim submission confirmation sent",
    [HISTORY_EVENT_REFERENCE.EVT_COM_CLM_002]: () =>
      "Claim approved email sent",
  };

function escapeHtmlValue(value: unknown): string {
  if (typeof value === "string") {
    return escapeHtml(value);
  }

  if (typeof value === "number") {
    return escapeHtml(String(value));
  }

  throw new Error(`Couldn't format history event eventData`);
}

function formatEnum(enumValue: string): string {
  return enumValue
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./v, (char) => char.toUpperCase());
}

function formatHistoryEventUpdate(
  eventReference: string,
  eventData: Record<string, unknown> | null | undefined,
): string {
  // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Dynamic property access requires bracket notation
  const formatter = HISTORY_EVENT_FORMATTERS[eventReference];

  try {
    const historyEventHeading = formatter
      ? formatter(eventData)
      : escapeHtml(eventReference);

    return `<strong>${historyEventHeading}</strong>`;
  } catch (error) {
    console.error(
      `Error formatting history event for reference ${eventReference}:`,
      error,
    );
    return `<strong>This update cannot be displayed due to an error.</strong>`;
  }
}

export function formatHistoryRows(
  history: HistoryEvent[],
): Array<Array<{ text?: string; html?: string }>> {
  return history.map((event) => {
    const timestamp = formatDateTime(event.timestamp);
    const actor = escapeHtml(event.actor);
    const update = formatHistoryEventUpdate(
      event.eventReference,
      event.eventData,
    );

    return [{ text: timestamp }, { text: actor }, { html: update }];
  });
}
