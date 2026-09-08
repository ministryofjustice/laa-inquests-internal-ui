import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import { UpstreamAuthError } from "#src/ports/common/upstreamAuthError.js";

export function throwUseCaseFailure(
  result: UseCaseResult<unknown, unknown>,
  message: string,
): never {
  const cause =
    result.status === "TECHNICAL_FAILURE" ? result.cause : undefined;

  // Auth failures propagate untouched so the error middleware can act on them.
  if (cause instanceof UpstreamAuthError) {
    throw cause;
  } else {
    throw new Error(message, { cause });
  }
}
