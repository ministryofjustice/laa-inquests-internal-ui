import { expect } from "chai";

import { formatHistoryRows } from "#src/adaptors/presenter/applications/History.formatter.js";
import { HISTORY_EVENT_REFERENCE } from "#src/infrastructure/locales/constants.js";

describe("HistoryFormatter", () => {
  const laaReference = "INQ-001";

  describe("escapeHtmlValue()", () => {
    it("formats numeric values correctly", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_APP_003,
            eventData: {
              laaReference: 12345,
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        '<strong>Certificate created</strong><br /><a href="/applications/12345/certificate">View certificate</a>',
      );
    });

    it("formats string values correctly", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
            eventData: {
              claimReference: "ABC123",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        '<strong>POA claim <a href="/applications/INQ-001/claims/ABC123">ABC123</a> auto-approved</strong>',
      );
    });

    it("throws an error when value is not a string or number", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
            eventData: {
              claimReference: { nested: "object" },
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("Displays an error when value eventData can't be formatted", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_003,
            eventData: {
              claimReference: null,
            },
          },
        ],
        laaReference,
      );

      expect(row?.[0]?.text).to.contain("17 Aug 2026");
      expect(row?.[1]?.text).to.equal("Caseworker");
      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("Still displays other events when an event cannot be formatted", () => {
      const [row1, row2] = formatHistoryRows(
        [
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
        ],
        laaReference,
      );

      expect(row1?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
      expect(row2?.[2]?.html).to.equal(
        '<strong>POA claim <a href="/applications/INQ-001/claims/ABC123">ABC123</a> auto-approved</strong>',
      );
    });
  });

  describe("History note event formatting", () => {
    it("formats a note event with the note text", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-27T10:00:00.000Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_X_001,
            eventData: {
              noteText: "This is a case note",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        "<strong>Caseworker note added</strong><br />This is a case note",
      );
    });

    it("preserves line breaks in note text", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-27T10:00:00.000Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_X_001,
            eventData: {
              noteText: "First line\n\r\nSecond line\rThird line",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        "<strong>Caseworker note added</strong><br />First line<br /><br />Second line<br />Third line",
      );
    });

    it("escapes HTML in note text", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-27T10:00:00.000Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_X_001,
            eventData: {
              noteText: '<b>bold</b> & "quoted"',
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.not.contain("<b>");
      expect(row?.[2]?.html).to.contain("&lt;b&gt;bold&lt;/b&gt;");
      expect(row?.[2]?.html).to.contain("&amp;");
      expect(row?.[2]?.html).to.contain("&quot;quoted&quot;");
    });
  });

  describe("Claim event formatting", () => {
    it("renders the claim reference as a hyperlink in the claim submitted message", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001,
            eventData: {
              claimType: "PAYMENT_ON_ACCOUNT",
              claimReference: "INQC-0010-0010",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        '<strong>Payment on account claim received: <a href="/applications/INQ-001/claims/INQC-0010-0010">INQC-0010-0010</a></strong>',
      );
    });

    it("renders the claim reference as a hyperlink in the claim assessment complete message", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_002,
            eventData: {
              claimType: "FINAL_BILL",
              claimDecision: "REJECTED",
              claimReference: "INQC-0010-0010",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        '<strong>Final bill claim rejected: <a href="/applications/INQ-001/claims/INQC-0010-0010">INQC-0010-0010</a></strong>',
      );
    });

    it("renders the claim reference as a hyperlink in the POA auto-rejected message", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "System",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_004,
            eventData: {
              claimReference: "ABC123",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        '<strong>POA claim <a href="/applications/INQ-001/claims/ABC123">ABC123</a> auto-rejected</strong>',
      );
    });

    it("errors when the claim reference is absent from the claim submitted event", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001,
            eventData: {
              claimType: "PAYMENT_ON_ACCOUNT",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("errors when the claim reference is absent from the claim assessment complete event", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_002,
            eventData: {
              claimType: "FINAL_BILL",
              claimDecision: "REJECTED",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.equal(
        "<strong>This update cannot be displayed due to an error.</strong>",
      );
    });

    it("displays the claim reference exactly as stored", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001,
            eventData: {
              claimType: "PAYMENT_ON_ACCOUNT",
              claimReference: "iNqC-0010-0010",
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.contain(">iNqC-0010-0010</a>");
      expect(row?.[2]?.html).to.contain(
        'href="/applications/INQ-001/claims/iNqC-0010-0010"',
      );
    });

    it("escapes HTML in the claim reference", () => {
      const [row] = formatHistoryRows(
        [
          {
            timestamp: "2026-08-17T08:35:24.110277Z",
            actor: "Caseworker",
            eventReference: HISTORY_EVENT_REFERENCE.EVT_BUS_CLM_001,
            eventData: {
              claimType: "PAYMENT_ON_ACCOUNT",
              claimReference: '<script>"x"</script>',
            },
          },
        ],
        laaReference,
      );

      expect(row?.[2]?.html).to.not.contain("<script>");
      expect(row?.[2]?.html).to.contain("&lt;script&gt;");
      expect(row?.[2]?.html).to.contain("&quot;x&quot;");
    });
  });
});
