import { strict as assert } from "assert";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";

const SHA256_HEX_LENGTH = 64;

describe("hashSessionId", () => {
  it("returns the same hash for the same session id", () => {
    assert.equal(hashSessionId("session-abc"), hashSessionId("session-abc"));
  });

  it("returns different hashes for different session ids", () => {
    assert.notEqual(hashSessionId("session-abc"), hashSessionId("session-xyz"));
  });

  it("returns a hex sha256 digest that does not contain the session id", () => {
    const hash = hashSessionId("session-abc");

    assert.match(hash, /^[0-9a-f]+$/);
    assert.equal(hash.length, SHA256_HEX_LENGTH);
    assert.equal(hash.includes("session-abc"), false);
  });
});
