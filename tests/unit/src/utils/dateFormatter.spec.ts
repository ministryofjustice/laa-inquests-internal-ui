import { expect } from "chai";
import {
  formatDate,
  formatDateFromParts,
  formatDateTime,
} from "#src/utils/dateFormatter.js";

describe("formatDate()", () => {
  it("formats a valid ISO date string correctly", () => {
    expect(formatDate("1986-01-06T00:00:00Z")).to.equal("6 Jan 1986");
    expect(formatDate("2023-07-28")).to.equal("28 Jul 2023");
  });

  it("formats dates with single-digit days without leading zero", () => {
    expect(formatDate("2023-02-05")).to.equal("5 Feb 2023");
  });

  it("handles invalid date strings by returning the original input", () => {
    expect(formatDate("invalid-date")).to.equal("invalid-date");
    expect(formatDate("")).to.equal("");
  });
});

describe("formatDateFromParts()", () => {
  it("formats valid day, month, year parts into a readable date", () => {
    expect(formatDateFromParts("6", "1", "1986")).to.equal("6 Jan 1986");
    expect(formatDateFromParts("28", "7", "2023")).to.equal("28 Jul 2023");
  });

  it("formats single-digit days without leading zero", () => {
    expect(formatDateFromParts("5", "2", "2023")).to.equal("5 Feb 2023");
  });

  it("returns undefined when any part is missing", () => {
    expect(formatDateFromParts(undefined, "1", "2023")).to.be.undefined;
    expect(formatDateFromParts("1", undefined, "2023")).to.be.undefined;
    expect(formatDateFromParts("1", "1", undefined)).to.be.undefined;
    expect(formatDateFromParts()).to.be.undefined;
  });
});

describe("formatDateTime()", () => {
  it("formats a valid ISO date-time string correctly", () => {
    expect(formatDateTime("2026-05-21T08:46:36.793278")).to.equal(
      "21 May 2026 08:46",
    );
  });

  it("handles invalid date-time strings by returning the original input", () => {
    expect(formatDateTime("invalid-date-time")).to.equal("invalid-date-time");
    expect(formatDateTime("")).to.equal("");
  });
});
