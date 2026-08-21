import { strict as assert } from "assert";
import { PrepareConfirmPublicAuthorityViewUseCase } from "#src/use-cases/applications/publicAuthority/PrepareConfirmPublicAuthorityView.useCase.js";

const allPublicBodies = [
  {
    publicBodyId: "Attorney General's Office",
    publicBodyDescription: "Attorney General's Office",
  },
  { publicBodyId: "Cabinet Office", publicBodyDescription: "Cabinet Office" },
  {
    publicBodyId: "Department for Transport",
    publicBodyDescription: "Department for Transport",
  },
];

describe("PrepareConfirmPublicAuthorityViewUseCase", () => {
  const useCase = new PrepareConfirmPublicAuthorityViewUseCase();

  it("returns selected public authorities with descriptions matching the session selection", () => {
    const result = useCase.execute({
      selectedPublicAuthorityIds: [
        "Cabinet Office",
        "Department for Transport",
      ],
      allPublicBodies,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorities: [
        { id: "Cabinet Office", description: "Cabinet Office" },
        {
          id: "Department for Transport",
          description: "Department for Transport",
        },
      ],
    });
  });

  it("returns a single selected public authority when only one is chosen", () => {
    const result = useCase.execute({
      selectedPublicAuthorityIds: ["Attorney General's Office"],
      allPublicBodies,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorities: [
        {
          id: "Attorney General's Office",
          description: "Attorney General's Office",
        },
      ],
    });
  });

  it("returns an empty list when no selected IDs match the reference data", () => {
    const result = useCase.execute({
      selectedPublicAuthorityIds: ["Non-existent Body"],
      allPublicBodies,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorities: [],
    });
  });

  it("returns an empty list when selectedPublicAuthorityIds is empty", () => {
    const result = useCase.execute({
      selectedPublicAuthorityIds: [],
      allPublicBodies,
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorities: [],
    });
  });
});
