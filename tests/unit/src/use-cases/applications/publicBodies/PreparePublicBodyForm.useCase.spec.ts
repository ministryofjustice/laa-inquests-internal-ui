import { strict as assert } from "assert";
import { PreparePublicBodyFormUseCase } from "#src/use-cases/applications/publicBodies/PreparePublicBodyForm.useCase.js";

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

describe("PreparePublicBodyFormUseCase", () => {
  const useCase = new PreparePublicBodyFormUseCase();

  it("builds items from all public bodies and preselects the ones currently on the application", () => {
    const result = useCase.execute({
      allPublicBodies,
      currentPublicBodyIds: ["Cabinet Office"],
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      items: [
        {
          value: "Attorney General's Office",
          text: "Attorney General's Office",
        },
        { value: "Cabinet Office", text: "Cabinet Office" },
        {
          value: "Department for Transport",
          text: "Department for Transport",
        },
      ],
      selectedPublicBodyIds: ["Cabinet Office"],
    });
  });
});
