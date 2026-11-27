import { PROSE_UNSAFE_CHARACTERS_REGEX } from "#src/infrastructure/locales/constants.js";

/** Whether free text holds `<`, `>` or a control or format character other than a line break or tab. */
export function hasUnsafeProseCharacters(value: string): boolean {
  return PROSE_UNSAFE_CHARACTERS_REGEX.test(value);
}
