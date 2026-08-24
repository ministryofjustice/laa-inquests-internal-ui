import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { PublicAuthorityAdaptor } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type {
  TypedRequest,
  IdParams,
} from "#src/infrastructure/express/api.types.js";
import type { PublicAuthorityFormData } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.validator.js";
import { PublicAuthorityValidator } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.validator.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

describe("PublicAuthorityAdaptor", () => {
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;
  let sessionHelperStub: StubbedInstance<SessionHelper>;
  let adaptor: PublicAuthorityAdaptor;
  let validator: PublicAuthorityValidator;

  const applicationId = "LAA-123";
  const allPublicBodies = [
    {
      publicBodyId: "Attorney General's Office",
      publicBodyDescription: "Attorney General's Office",
    },
    {
      publicBodyId: "Cabinet Office",
      publicBodyDescription: "Cabinet Office",
    },
    {
      publicBodyId: "Department for Transport",
      publicBodyDescription: "Department for Transport",
    },
  ];

  const mockApplication = {
    publicBodies: [
      {
        publicBodyId: "Cabinet Office",
        publicBodyDescription: "Cabinet Office",
      },
    ],
  };

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    applicationPortStub = stubInterface<ApplicationPort>();
    sessionHelperStub = stubInterface<SessionHelper>();
    validator = new PublicAuthorityValidator();
    adaptor = new PublicAuthorityAdaptor(
      applicationPortStub,
      sessionHelperStub,
      validator,
    );
    requestStub.params = { applicationId };
    requestStub.query = {};
    requestStub.session = {
      user: { accessToken: "access-token-123" },
    } as unknown as Request["session"];
  });

  describe("renderSelectionForm", () => {
    beforeEach(() => {
      applicationPortStub.getApplication.resolves(mockApplication as any);
      applicationPortStub.getPublicBodies.resolves(allPublicBodies);
    });

    it("renders the selection form with the correct view name", async () => {
      await adaptor.renderSelectionForm(requestStub as Request, responseStub);

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/update-public-authority",
      );
    });

    it("renders with all public authority options and current selections preselected", async () => {
      await adaptor.renderSelectionForm(requestStub as Request, responseStub);

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.equal(renderArgs.applicationId, applicationId);
      assert.deepEqual(renderArgs.publicAuthorityOptions, [
        {
          value: "Attorney General's Office",
          text: "Attorney General's Office",
        },
        { value: "Cabinet Office", text: "Cabinet Office" },
        {
          value: "Department for Transport",
          text: "Department for Transport",
        },
      ]);
      assert.deepEqual(renderArgs.selectedPublicAuthorityIds, [
        "Cabinet Office",
      ]);
    });

    it("clears session data on fresh entry without from=confirm", async () => {
      await adaptor.renderSelectionForm(requestStub as Request, responseStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
      assert.deepEqual(sessionHelperStub.clearSessionData.getCall(0).args, [
        requestStub,
        "publicAuthority",
      ]);
    });

    it("preserves session selection when from=confirm", async () => {
      requestStub.query = { from: "confirm" };
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify([
          "Attorney General's Office",
          "Department for Transport",
        ]),
      });

      await adaptor.renderSelectionForm(requestStub as Request, responseStub);

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.deepEqual(renderArgs.selectedPublicAuthorityIds, [
        "Attorney General's Office",
        "Department for Transport",
      ]);
      assert.equal(sessionHelperStub.clearSessionData.callCount, 0);
    });

    it("falls back to current public body IDs when from=confirm but no session data exists", async () => {
      requestStub.query = { from: "confirm" };
      sessionHelperStub.getSessionData.returns(null);

      await adaptor.renderSelectionForm(requestStub as Request, responseStub);

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.deepEqual(renderArgs.selectedPublicAuthorityIds, [
        "Cabinet Office",
      ]);
    });

    it("uses submitted values when provided (re-render after validation error)", async () => {
      const errorSummaries = {
        noPublicAuthoritySelected: {
          text: en.pages.applicationOverview.publicAuthority.validationError
            .notEmpty,
        },
      };

      await adaptor.renderSelectionForm(
        requestStub as Request,
        responseStub,
        errorSummaries,
        [],
      );

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.deepEqual(renderArgs.selectedPublicAuthorityIds, []);
      assert.deepEqual(renderArgs.errorSummaries, errorSummaries);
    });
  });

  describe("processSelectionForm", () => {
    let renderSelectionFormSpy: sinon.SinonSpy;

    beforeEach(() => {
      applicationPortStub.getApplication.resolves(mockApplication as any);
      applicationPortStub.getPublicBodies.resolves(allPublicBodies);
      renderSelectionFormSpy = sinon.spy(adaptor, "renderSelectionForm");
    });

    afterEach(() => {
      renderSelectionFormSpy.restore();
    });

    it("stores selected IDs in session and redirects to confirm page", async () => {
      requestStub.body = {
        publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
      };

      await adaptor.processSelectionForm(
        requestStub as unknown as TypedRequest<
          PublicAuthorityFormData,
          IdParams
        >,
        responseStub,
      );

      assert.equal(sessionHelperStub.storeSessionData.callCount, 1);
      const storeArgs = sessionHelperStub.storeSessionData.getCall(0).args;
      assert.equal(storeArgs[1], "publicAuthority");
      assert.deepEqual(JSON.parse(storeArgs[2].selectedPublicAuthorityIds), [
        "Cabinet Office",
        "Department for Transport",
      ]);

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/public-authority/confirm`,
      );
    });

    it("stores a single selected option in session", async () => {
      requestStub.body = { publicAuthorityOption: "Cabinet Office" };

      await adaptor.processSelectionForm(
        requestStub as unknown as TypedRequest<
          PublicAuthorityFormData,
          IdParams
        >,
        responseStub,
      );

      const storeArgs = sessionHelperStub.storeSessionData.getCall(0).args;
      assert.deepEqual(JSON.parse(storeArgs[2].selectedPublicAuthorityIds), [
        "Cabinet Office",
      ]);
    });

    it("re-renders the selection form with validation errors when no option is selected", async () => {
      requestStub.body = { publicAuthorityOption: undefined };

      await adaptor.processSelectionForm(
        requestStub as unknown as TypedRequest<
          PublicAuthorityFormData,
          IdParams
        >,
        responseStub,
      );

      assert.ok(renderSelectionFormSpy.calledOnce);
      const errorSummaries = renderSelectionFormSpy.getCall(0).args[2];
      assert.deepEqual(errorSummaries, {
        noPublicAuthoritySelected: {
          text: en.pages.applicationOverview.publicAuthority.validationError
            .notEmpty,
        },
      });
      assert.equal(responseStub.redirect.callCount, 0);
    });

    it("passes empty submitted values array when validation fails with no selection", async () => {
      requestStub.body = { publicAuthorityOption: undefined };

      await adaptor.processSelectionForm(
        requestStub as unknown as TypedRequest<
          PublicAuthorityFormData,
          IdParams
        >,
        responseStub,
      );

      const submittedValues = renderSelectionFormSpy.getCall(0).args[3];
      assert.deepEqual(submittedValues, []);
    });
  });

  describe("renderConfirmationPage", () => {
    beforeEach(() => {
      applicationPortStub.getPublicBodies.resolves(allPublicBodies);
    });

    it("renders the confirm view with the correct view name", async () => {
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify(["Cabinet Office"]),
      });

      await adaptor.renderConfirmationPage(
        requestStub as Request,
        responseStub,
      );

      assert.equal(responseStub.render.callCount, 1);
      assert.equal(
        responseStub.render.getCall(0).args[0],
        "application/confirm-public-authority",
      );
    });

    it("renders with correct back URL and summary list rows", async () => {
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify([
          "Cabinet Office",
          "Department for Transport",
        ]),
      });

      await adaptor.renderConfirmationPage(
        requestStub as Request,
        responseStub,
      );

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.equal(renderArgs.applicationId, applicationId);
      assert.equal(
        renderArgs.backUrl,
        `/applications/${applicationId}/public-authority?from=confirm`,
      );
      assert.deepEqual(renderArgs.publicAuthorityRows, [
        { key: { text: "Cabinet Office" }, value: { text: "" } },
        {
          key: { text: "Department for Transport" },
          value: { text: "" },
        },
      ]);
    });

    it("renders with empty rows when no session data exists", async () => {
      sessionHelperStub.getSessionData.returns(null);

      await adaptor.renderConfirmationPage(
        requestStub as Request,
        responseStub,
      );

      const renderArgs = responseStub.render.getCall(0)
        .args[1] as unknown as Record<string, unknown>;
      assert.deepEqual(renderArgs.publicAuthorityRows, []);
    });
  });

  describe("processConfirmation", () => {
    it("calls updateApplicationPublicBodies with the session selection and redirects to overview", async () => {
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify([
          "Cabinet Office",
          "Department for Transport",
        ]),
      });
      applicationPortStub.updateApplicationPublicBodies.resolves();

      await adaptor.processConfirmation(requestStub as Request, responseStub);

      assert.equal(
        applicationPortStub.updateApplicationPublicBodies.callCount,
        1,
      );
      assert.deepEqual(
        applicationPortStub.updateApplicationPublicBodies.getCall(0).args,
        [
          applicationId,
          "access-token-123",
          ["Cabinet Office", "Department for Transport"],
        ],
      );

      assert.equal(responseStub.redirect.callCount, 1);
      assert.equal(
        responseStub.redirect.getCall(0).args[0],
        `/applications/${applicationId}/overview`,
      );
    });

    it("clears session data and sets flash on success", async () => {
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify(["Cabinet Office"]),
      });
      applicationPortStub.updateApplicationPublicBodies.resolves();

      await adaptor.processConfirmation(requestStub as Request, responseStub);

      assert.equal(sessionHelperStub.clearSessionData.callCount, 1);
      assert.deepEqual(sessionHelperStub.clearSessionData.getCall(0).args, [
        requestStub,
        "publicAuthority",
      ]);

      assert.equal(sessionHelperStub.setFlash.callCount, 1);
      assert.deepEqual(sessionHelperStub.setFlash.getCall(0).args, [
        requestStub,
        "publicAuthority",
        "publicAuthorityUpdated",
      ]);
    });

    it("throws when the update fails", async () => {
      sessionHelperStub.getSessionData.returns({
        selectedPublicAuthorityIds: JSON.stringify(["Cabinet Office"]),
      });
      applicationPortStub.updateApplicationPublicBodies.rejects(
        new Error("Upstream error"),
      );

      await assert.rejects(
        () => adaptor.processConfirmation(requestStub as Request, responseStub),
        /Unable to update public authorities/,
      );
    });

    it("throws when session has no selected public authorities", async () => {
      sessionHelperStub.getSessionData.returns(null);
      applicationPortStub.updateApplicationPublicBodies.resolves();

      await assert.rejects(
        () => adaptor.processConfirmation(requestStub as Request, responseStub),
        /Unable to update public authorities/,
      );
    });
  });
});
