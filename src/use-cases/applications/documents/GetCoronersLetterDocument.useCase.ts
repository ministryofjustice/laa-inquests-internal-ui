import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface GetCoronersLetterDocumentInput {
  laaReference: string;
  accessToken?: string;
}

interface CoronersLetterDocument {
  data: Buffer;
  contentType: string;
}

export type GetCoronersLetterDocumentResult =
  | { status: "SUCCESS"; data: CoronersLetterDocument }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_INPUT" };

export class GetCoronersLetterDocumentUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: GetCoronersLetterDocumentInput,
  ): Promise<GetCoronersLetterDocumentResult> {
    if (input.laaReference === "") {
      return { status: "INVALID_INPUT" };
    }

    const document = await this.applicationPort.getCoronersLetterDocument(
      input.laaReference,
      input.accessToken,
    );

    if (document === undefined) {
      return { status: "NOT_FOUND" };
    } else {
      return { status: "SUCCESS", data: document };
    }
  }
}
