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

export function formatDateFromParts(
  day?: string,
  month?: string,
  year?: string,
): string | undefined {
  if (!day || !month || !year) {
    return undefined;
  }

  return formatDate(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
  );
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hour}:${minute}`;
}
