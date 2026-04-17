/**
 * Data Transformation Helpers
 *
 * Utility functions for safely transforming and validating data from form inputs
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasProperty(
  obj: unknown,
  key: string,
): obj is Record<string, unknown> {
  return isRecord(obj) && key in obj;
}

export function capitaliseFirst(str: string): string {
  return str.replace(/\b\w/gv, (char) => char.toUpperCase());
}

// Constants for date formatting
const DATE_PADDING_WIDTH = 2;
const DATE_PADDING_CHAR = "0";

export function dateStringFromThreeFields(
  day: string,
  month: string,
  year: string,
): string {
  const paddedMonth = month.padStart(DATE_PADDING_WIDTH, DATE_PADDING_CHAR);
  const paddedDay = day.padStart(DATE_PADDING_WIDTH, DATE_PADDING_CHAR);
  return `${year}-${paddedMonth}-${paddedDay}`;
}

export function safeBodyString(body: unknown, key: string): unknown {
  return hasProperty(body, key) ? body[key] : "";
}

export function extractFormFields(
  body: unknown,
  keys: string[],
): Record<string, unknown> {
  return keys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = safeBodyString(body, key);
    return acc;
  }, {});
}
