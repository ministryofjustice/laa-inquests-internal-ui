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
        '<strong>Certificate created <br /> <a href="/applications/12345/certificate">View certificate</a></strong>',
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

    it("defaults to empty string when value is not a string or number", () => {
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
        "<strong>POA claim  auto-approved</strong>",
      );
    });
  });
});
