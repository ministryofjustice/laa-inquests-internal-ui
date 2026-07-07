import { strict as assert } from "assert";
import { ProcessCertificateStartDateUseCase } from "#src/use-cases/applications/decision/ProcessCertificateStartDate.useCase.js";

describe("ProcessCertificateStartDateUseCase", () => {
  const useCase = new ProcessCertificateStartDateUseCase();

  it("returns VALIDATION_FAILED with errors and merged date parts", () => {
    const errors = {
      certificateStartDate: { text: "Enter the certificate start date" },
    };

    const result = useCase.execute({
      day: "",
      month: "",
      year: "",
      validate: () => errors,
      existingSessionData: { overallDecision: "GRANTED" },
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    assert.deepEqual(result.validationErrors, errors);
    assert.deepEqual(result.data, {
      overallDecision: "GRANTED",
      certificateStartDateDay: "",
      certificateStartDateMonth: "",
      certificateStartDateYear: "",
    });
  });

  it("returns SUCCESS with merged certificate start date parts", () => {
    const result = useCase.execute({
      day: "1",
      month: "1",
      year: "2020",
      validate: () => ({}),
      existingSessionData: { overallDecision: "GRANTED" },
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      overallDecision: "GRANTED",
      certificateStartDateDay: "1",
      certificateStartDateMonth: "1",
      certificateStartDateYear: "2020",
    });
  });

  it("returns TECHNICAL_FAILURE when validate throws", () => {
    const result = useCase.execute({
      day: "1",
      month: "1",
      year: "2020",
      validate: () => {
        throw new Error("unexpected error");
      },
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    if (result.status === "TECHNICAL_FAILURE") {
      assert.equal(result.reason, "UNEXPECTED_EXCEPTION");
      assert.ok(result.cause instanceof Error);
    }
  });

  it("preserves date parts exactly as entered", () => {
    const result = useCase.execute({
      day: "5",
      month: "9",
      year: "2021",
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      certificateStartDateDay: "5",
      certificateStartDateMonth: "9",
      certificateStartDateYear: "2021",
    });
  });
});
