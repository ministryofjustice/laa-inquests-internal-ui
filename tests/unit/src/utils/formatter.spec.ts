import { expect } from "chai";
import {
  formatCurrency,
  formatFileSize,
  toTitleCase,
} from "#src/utils/formatter.js";

describe("formatCurrency()", () => {
  it("formats a whole number as GBP currency", () => {
    expect(formatCurrency(25000)).to.equal("£25,000");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).to.equal("£0");
  });

  it("formats a number with pence", () => {
    expect(formatCurrency(1234.56)).to.equal("£1,234.56");
  });

  it("formats a number with trailing zero pence", () => {
    expect(formatCurrency(1000.5)).to.equal("£1,000.50");
  });

  it("formats a small amount correctly", () => {
    expect(formatCurrency(500)).to.equal("£500");
  });
});

describe("toTitleCase()", () => {
  it("capitalises the first letter and lowercases the rest", () => {
    expect(toTitleCase("SUBSTANTIVE")).to.equal("Substantive");
  });

  it("handles an already title-cased string", () => {
    expect(toTitleCase("Pending")).to.equal("Pending");
  });

  it("handles a fully lowercase string", () => {
    expect(toTitleCase("refuse")).to.equal("Refuse");
  });

  it("handles a single character", () => {
    expect(toTitleCase("a")).to.equal("A");
  });
});

describe("formatFileSize()", () => {
  it("returns an empty string when the size is not known", () => {
    expect(formatFileSize(undefined)).to.equal("");
    expect(formatFileSize(null)).to.equal("");
  });

  it("formats sizes below 1MB in KB", () => {
    expect(formatFileSize(104448)).to.equal("102KB");
  });

  it("shows 0KB for an empty file", () => {
    expect(formatFileSize(0)).to.equal("0KB");
  });

  it("shows at least 1KB for non-empty files below 1KB", () => {
    expect(formatFileSize(1)).to.equal("1KB");
    expect(formatFileSize(300)).to.equal("1KB");
  });

  it("formats sizes of 1MB or more in MB with one decimal place", () => {
    expect(formatFileSize(1572864)).to.equal("1.5MB");
    expect(formatFileSize(1048576)).to.equal("1.0MB");
  });
});
