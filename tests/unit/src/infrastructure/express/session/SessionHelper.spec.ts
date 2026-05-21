/**
 * Session Helpers Unit    it('stores data under specified namespace', () => {
      const req = createMockRequest({});
      const testData = { name: 'John', age: '25' }; // Use strings as required

      storeSessionData(req, 'testNamespace', testData);

      expect(req.session.testNamespace).to.deep.equal(testData);
    });*
 * Template examples for session management utility functions.
 * Shows patterns for testing form data storage and retrieval.
 */

import { describe, it, beforeEach } from "mocha";
import { expect } from "chai";
import type { Request } from "express";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

// Mock request factory with session
function createMockRequest(sessionData: Record<string, any> = {}): Request {
  return {
    session: { ...sessionData },
  } as Request;
}

describe("Session Helpers", () => {
  let sessionHelper: SessionHelper;

  beforeEach(() => {
    sessionHelper = new SessionHelper();
  });

  describe("storeSessionData()", () => {
    it("stores data under specified namespace", () => {
      const req = createMockRequest();
      const testData = { name: "John", age: "30" };

      sessionHelper.storeSessionData(req, "testNamespace", testData);

      expect(req.session.testNamespace).to.deep.equal(testData);
    });
  });

  describe("getSessionData()", () => {
    it("retrieves data from specified namespace", () => {
      const sessionData = { testNamespace: { name: "John", age: "30" } };
      const req = createMockRequest(sessionData);

      const result = sessionHelper.getSessionData(req, "testNamespace");

      expect(result).to.deep.equal({ name: "John", age: "30" });
    });

    it("returns null when namespace does not exist", () => {
      const req = createMockRequest();

      const result = sessionHelper.getSessionData(req, "nonexistent");

      expect(result).to.be.null;
    });
  });

  describe("clearSessionData()", () => {
    it("clears data from specified namespace", () => {
      const req = createMockRequest({ testNamespace: { data: "value" } });

      sessionHelper.clearSessionData(req, "testNamespace");

      expect(req.session.testNamespace).to.be.undefined;
    });
  });

  describe("storeOriginalFormData()", () => {
    it("converts and stores form data as strings", () => {
      const req = createMockRequest({});
      const formData = { name: "John", age: 30, active: true, empty: null };

      sessionHelper.storeOriginalFormData(req, "testOriginal", formData);
      const stored = sessionHelper.getSessionData(req, "testOriginal");

      expect(stored).to.deep.equal({
        name: "John",
        age: "30",
        active: "true",
        empty: "",
      });
    });
  });
});
