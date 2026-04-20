import type { AxiosError } from "#node_modules/axios/index.js";

export function isAxiosErrorWithResponse(
  error: unknown,
): error is AxiosError & { response: { status: number } } {
  return (
    error !== null &&
    typeof error === "object" &&
    "response" in error &&
    error.response !== null &&
    typeof error.response === "object" &&
    "status" in error.response &&
    typeof (error.response as { status: unknown }).status === "number"
  );
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
