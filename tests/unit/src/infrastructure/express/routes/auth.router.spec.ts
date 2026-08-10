import { strict as assert } from "assert";
import sinon from "sinon";
import express from "express";
import { stubInterface } from "ts-sinon";
import type { Request, Response } from "express";
import { createAuthRouter } from "#src/infrastructure/express/routes/auth.router.js";
import type { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";

interface RouteLayer {
  route?: {
    path: string;
    stack: { handle: (req: Request, res: Response) => void }[];
  };
}

function findRoute(
  router: express.Router,
  path: string,
): RouteLayer["route"] | undefined {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack;
  return stack.find((layer) => layer.route?.path === path)?.route;
}

describe("createAuthRouter", () => {
  let authAdaptor: AuthAdaptor;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    authAdaptor = stubInterface<AuthAdaptor>();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    sinon.restore();
  });

  describe("when NODE_ENV is test", () => {
    it("registers the /test-login route", () => {
      process.env.NODE_ENV = "test";

      const router = createAuthRouter(express.Router(), authAdaptor);

      assert.notEqual(findRoute(router, "/test-login"), undefined);
    });

    it("seeds the session user and redirects to home", () => {
      process.env.NODE_ENV = "test";
      const router = createAuthRouter(express.Router(), authAdaptor);
      const route = findRoute(router, "/test-login");
      const req = stubInterface<Request>();
      const res = stubInterface<Response>();
      req.session = {} as never;

      route?.stack[0].handle(req, res);

      assert.deepEqual(req.session.user, {
        userId: "test-caseworker",
        userName: "[MOJUSER] - [INTSILAS] Internal E2E",
        accessToken: "test-access-token",
      });
      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], "/");
    });
  });

  describe("when NODE_ENV is not test", () => {
    it("does not register the /test-login route", () => {
      process.env.NODE_ENV = "production";

      const router = createAuthRouter(express.Router(), authAdaptor);

      assert.equal(findRoute(router, "/test-login"), undefined);
    });
  });
});
