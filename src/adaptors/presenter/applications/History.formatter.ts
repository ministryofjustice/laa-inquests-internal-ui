import { escapeHtml } from "#src/utils/addressFormatter.js";
import { HISTORY_EVENT_REFERENCE } from "#src/infrastructure/locales/constants.js";
import { formatDateTime } from "#src/utils/dateFormatter.js";
import type { HistoryEvent } from "#src/adaptors/models/application.types.js";

/**
 * Type definition for event formatter functions.
 * Event formatters take optional eventData and return a heading (always bold) and an
 * optional detail (rendered below the heading, not bold).
 */
export type EventFormatter = (eventData?: Record<string, unknown> | null) => {
  heading: string;
  detail?: string;
};

/**
 * Registry of history event formatters.
 * Each event reference maps to a formatter function that returns the event description.
 * Dynamic events extract and interpolate data from eventData; static events return fixed strings.
 *
 * To add a new event formatter:
 * 1. Add the event reference from HISTORY_EVENT_REFERENCE as a key
 * 2. Return { heading } for simple events
 * 3. For events that also require a body, extract and format fields from eventData, then return { heading, detail }
 */
export const HISTORY_EVENT_FORMATTERS: Partial<Record<string, EventFormatter>> =
  {
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_001]: () => ({
      heading: "Application received",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_002]: (eventData) => {
      const decision = escapeHtmlValue(eventData?.meritsDecision).toLowerCase();
      const heading = `Application ${decision}`;
      if (decision !== "refused") {
        return { heading };
      }

      const formattedRefusalReason = formatEnum(
        escapeHtmlValue(eventData?.refusalReason),
      );
      const formattedRefusalJustification = escapeHtmlValue(
        eventData?.refusalJustification,
      );

      return {
        heading,
        detail: `${formattedRefusalReason}<br />${formattedRefusalJustification}`,
      };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_003]: (eventData) => {
      const laaReference = escapeHtmlValue(eventData?.laaReference);
      return {
        heading: "Certificate created",
        detail: `<a href="/applications/${laaReference}/certificate">View certificate</a>`,
      };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_004]: (eventData) => {
      const oldPublicBodies = escapeHtmlValue(
        Array.isArray(eventData?.oldPublicBodies)
          ? eventData.oldPublicBodies.join(", ")
          : eventData?.oldPublicBodies,
      );
      const newPublicBodies = escapeHtmlValue(
        Array.isArray(eventData?.newPublicBodies)
          ? eventData.newPublicBodies.join(", ")
          : eventData?.newPublicBodies,
      );
      return {
        heading: `Interested parties updated from ${oldPublicBodies} to ${newPublicBodies}`,
      };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_X_001]: (eventData) => ({
      heading: "Caseworker note added",
      detail: escapeHtmlValue(eventData?.noteText),
    }),
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001]: (eventData) => {
      const claimType = formatEnum(escapeHtmlValue(eventData?.claimType));
      return { heading: `${claimType} claim received` };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_002]: (eventData) => {
      const claimType = formatEnum(escapeHtmlValue(eventData?.claimType));
      const decision = formatEnum(
        escapeHtmlValue(eventData?.claimDecision),
      ).toLowerCase();
      return { heading: `${claimType} claim ${decision}` };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003]: (eventData) => {
      const claimReference = escapeHtmlValue(eventData?.claimReference);
      return { heading: `POA claim ${claimReference} auto-approved` };
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_004]: (eventData) => {
      const claimReference = escapeHtmlValue(eventData?.claimReference);
      return { heading: `POA claim ${claimReference} auto-rejected` };
    },

    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_001]: () => ({
      heading: "Application submission confirmation sent",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_002]: () => ({
      heading: "Application granted email sent",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_003]: () => ({
      heading: "Application granted letter sent",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_COM_APP_004]: () => ({
      heading: "Application refused email sent",
    }),

    [HISTORY_EVENT_REFERENCE.EVT_COM_CLM_001]: () => ({
      heading: "Claim submission confirmation sent",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_COM_CLM_002]: () => ({
      heading: "Claim approved email sent",
    }),
    [HISTORY_EVENT_REFERENCE.EVT_COM_CLM_003]: () => ({
      heading: "Claim rejected email sent",
    }),
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
    const { heading, detail } = formatter
      ? formatter(eventData)
      : { heading: escapeHtml(eventReference) };

    return `<strong>${heading}</strong>${detail ? `<br />${detail}` : ""}`;
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
    const update = formatHistoryEventUpdate(
      event.eventReference,
      event.eventData,
    );

    // event.actor is rendered via a "text:" table field, which nunjucks auto-escapes on render, so we don't need to escape it here.
    // However, we do need to escape the update, which is rendered via an "html:" table field.
    return [{ text: timestamp }, { text: event.actor }, { html: update }];
  });
}
