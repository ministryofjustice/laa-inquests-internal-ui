/**
 * Date Formatting Helpers
 *
 * Utility functions for formatting dates in a consistent way across the application.
 */

// Constants
const DATE_PADDING_WIDTH = 2;
const DATE_PADDING_CHAR = "0";

export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function dateStringFromThreeFields(
  day: string,
  month: string,
  year: string,
): string {
  const paddedMonth = month.padStart(DATE_PADDING_WIDTH, DATE_PADDING_CHAR);
  const paddedDay = day.padStart(DATE_PADDING_WIDTH, DATE_PADDING_CHAR);
  return `${year}-${paddedMonth}-${paddedDay}`;
}
