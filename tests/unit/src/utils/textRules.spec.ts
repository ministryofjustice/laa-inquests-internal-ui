import { expect } from "chai";
import { hasUnsafeProseCharacters } from "#src/utils/textRules.js";

interface TextCase {
  value: string;
  reason: string;
}

describe("hasUnsafeProseCharacters()", () => {
  const safe: TextCase[] = [
    { value: "", reason: "empty text" },
    { value: "Plain sentence.", reason: "plain text" },
    { value: "Line one\nline two\r\nline three", reason: "line breaks" },
    { value: "Column\tone", reason: "a tab" },
    {
      value: "Tom & Jerry's \"quote\"; =+@ (see 'notes') #1 100% £5",
      reason: "punctuation and formula characters",
    },
    {
      value: "Jos\u00e9 \u674e\u660e Jose\u0301",
      reason: "accented and non-Latin text",
    },
    { value: "non\u00a0breaking space", reason: "a non-breaking space" },
  ];

  const unsafe: TextCase[] = [
    { value: "a < b", reason: "a less-than sign" },
    { value: "a > b", reason: "a greater-than sign" },
    { value: "<script>alert(1)</script>", reason: "a script tag" },
    { value: "<!-- comment -->", reason: "a comment marker" },
    { value: "bell\u0007", reason: "a control character" },
    { value: "null\u0000byte", reason: "a null byte" },
    { value: "escape\u001b[31m", reason: "an escape sequence" },
    { value: "delete\u007f", reason: "the delete character" },
    { value: "zero\u200bwidth", reason: "a zero-width space" },
    { value: "soft\u00adhyphen", reason: "a soft hyphen" },
    { value: "\ufeffbyte order mark", reason: "a byte order mark" },
    { value: "\u202etxt.exe", reason: "a right-to-left override" },
  ];

  safe.forEach(({ value, reason }) => {
    it(`allows ${reason}`, () => {
      expect(hasUnsafeProseCharacters(value)).to.equal(false);
    });
  });

  unsafe.forEach(({ value, reason }) => {
    it(`flags ${reason}`, () => {
      expect(hasUnsafeProseCharacters(value)).to.equal(true);
    });
  });
});
