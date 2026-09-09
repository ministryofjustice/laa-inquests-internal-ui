import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface AddHistoryNoteInput {
  laaReference: string;
  noteText: string;
  accessToken?: string;
}

export type AddHistoryNoteResult =
  | { status: "SUCCESS"; data: undefined }
  | { status: "INVALID_INPUT"; message: string };

export class AddHistoryNoteUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(input: AddHistoryNoteInput): Promise<AddHistoryNoteResult> {
    if (!input.laaReference) {
      return {
        status: "INVALID_INPUT",
        message: "Cannot add a history note without an laaReference",
      };
    }

    await this.applicationPort.addHistoryNote(
      input.laaReference,
      input.accessToken,
      input.noteText,
    );

    return { status: "SUCCESS", data: undefined };
  }
}
