import { expect } from "chai";

import { formatHistoryRows } from "#src/adaptors/presenter/applications/History.formatter.js";
import { HISTORY_EVENT_REFERENCE } from "#src/infrastructure/locales/constants.js";

describe("HistoryFormatter", () => {
  describe("escapeHtmlValue()", () => {
    it("formats numeric values correctly", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_APP_003,
          eventData: {
            laaReference: 12345,
          },
        },
      ]);

      expect(row?.[2]?.html).to.equal(
        '<strong>Certificate created</strong><br /><a href="/applications/12345/certificate">View certificate</a>',
      );
    });

    it("formats string values correctly", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
          eventData: {
            claimReference: "ABC123",
          },
        },
      ]);

      expect(row?.[2]?.html).to.equal(
        "<strong>POA claim ABC123 auto-approved</strong>",
      );
    });

    it("throws an error when value is not a string or number", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
          eventData: {
            claimReference: { nested: "object" },
          },
        },
      ]);

      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("Displays an error when value eventData can't be formatted", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
          eventData: {
            claimReference: null,
          },
        },
      ]);

      expect(row?.[0]?.text).to.contain("17 Aug 2026");
      expect(row?.[1]?.text).to.equal("Caseworker");
      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("Still displays other events when an event cannot be formatted", () => {
      const [row1, row2] = formatHistoryRows([
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
          eventData: {
            claimReference: null,
          },
        },
        {
          timestamp: "2026-08-17T08:35:24.110277Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
          eventData: {
            claimReference: "ABC123",
          },
        },
      ]);

      expect(row1?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
      expect(row2?.[2]?.html).to.equal(
        "<strong>POA claim ABC123 auto-approved</strong>",
      );
    });
  });

  describe("History note event formatting", () => {
    it("formats a note event with the note text", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-27T10:00:00.000Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_X_001,
          eventData: {
            noteText: "This is a case note",
          },
        },
      ]);

      expect(row?.[2]?.html).to.equal(
        "<strong>Caseworker note added</strong><br />This is a case note",
      );
    });

    it("escapes HTML in note text", () => {
      const [row] = formatHistoryRows([
        {
          timestamp: "2026-08-27T10:00:00.000Z",
          actor: "Caseworker",
          eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_X_001,
          eventData: {
            noteText: '<script>alert("xss")</script>',
          },
        },
      ]);

      expect(row?.[2]?.html).to.not.contain("<script>");
      expect(row?.[2]?.html).to.contain("&lt;script&gt;");
    });
  });
});
