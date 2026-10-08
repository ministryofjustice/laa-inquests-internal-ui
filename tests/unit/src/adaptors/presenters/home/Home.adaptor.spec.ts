import { assert } from "chai";
import { stubInterface } from "ts-sinon";
import type { Request, Response } from "express";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import { HomeAdaptor } from "#src/adaptors/presenter/home/Home.adaptor.js";

describe("Home adaptor", () => {
  describe("renderHome", () => {
    it("clears session data and renders the home page", () => {
      const sessionHelper = stubInterface<SessionHelper>();
      const adaptor = new HomeAdaptor(sessionHelper);

      const requestStub = stubInterface<Request>();
      const responseStub = stubInterface<Response>();

      adaptor.renderHome(requestStub, responseStub);

      assert.equal(
        sessionHelper.clearSessionData.callCount,
        1,
        "clearSessionData should be called once",
      );
      assert.equal(
        sessionHelper.clearSessionData.getCall(0).args[0],
        requestStub,
        "clearSessionData should be called with req",
      );
      assert.equal(
        sessionHelper.clearSessionData.getCall(0).args[1],
        "decision",
        "clearSessionData should be called with 'decision'",
      );
      assert.equal(responseStub.render.callCount, 1);
      assert.equal(responseStub.render.getCall(0).args[0], "main/index");
    });
  });
});
