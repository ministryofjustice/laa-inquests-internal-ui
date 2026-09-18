import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { UserRolesAdaptor } from "#src/adaptors/presenter/userRoles/UserRoles.adaptor.js";

describe("User Roles adaptor", () => {
  let userRolesAdaptor: UserRolesAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    userRolesAdaptor = new UserRolesAdaptor();
  });

  it("renders user roles page", () => {
    userRolesAdaptor.renderUserRolesPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "non-production/user-roles",
    ]);
  });
});
