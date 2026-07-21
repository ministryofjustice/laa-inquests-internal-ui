import { expect } from "chai";
import {
  formatAddressToHtml,
  type Address,
} from "#src/utils/addressFormatter.js";

describe("formatAddressToHtml()", () => {
  const baseAddress: Address = {
    addressLine1: "1 Test Road",
    addressLine2: null,
    townOrCity: "London",
    county: null,
    postcode: "SW1A 1AA",
  };

  it("returns an empty string for null input", () => {
    expect(formatAddressToHtml(null)).to.equal("");
  });

  it("returns an empty string for undefined input", () => {
    expect(formatAddressToHtml(undefined)).to.equal("");
  });

  it("joins populated address lines with <br>", () => {
    expect(formatAddressToHtml(baseAddress)).to.equal(
      "1 Test Road<br>London<br>SW1A 1AA",
    );
  });

  it("omits empty, null and whitespace-only optional lines", () => {
    expect(
      formatAddressToHtml({
        ...baseAddress,
        addressLine2: "  ",
        county: "",
      }),
    ).to.equal("1 Test Road<br>London<br>SW1A 1AA");
  });

  it("escapes html characters in address lines", () => {
    expect(
      formatAddressToHtml({
        ...baseAddress,
        addressLine1: "Flat <1> & Co",
        townOrCity: "Town 'A' \"B\"",
      }),
    ).to.equal(
      "Flat &lt;1&gt; &amp; Co<br>Town &#39;A&#39; &quot;B&quot;<br>SW1A 1AA",
    );
  });
});
