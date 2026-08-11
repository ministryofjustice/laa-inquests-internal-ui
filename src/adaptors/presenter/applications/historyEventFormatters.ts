import { escapeHtml } from "#src/utils/addressFormatter.js";
import { HISTORY_EVENT_REFERENCE } from "#src/infrastructure/locales/constants.js";

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
      const decision = eventData?.meritsDecision;
      const decisionText =
        typeof decision === "string" ? escapeHtml(decision) : "";
      return `Application ${decisionText}`;
    },
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_003]: () => "Certificate created",
    [HISTORY_EVENT_REFERENCE.EVT_BUS_APP_004]: () =>
      "Interested parties updated",
  };
