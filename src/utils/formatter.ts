export function formatCurrency(amount: number): string {
  const hasDecimals = amount % 1 !== 0;

  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) {
    return "";
  }

  if (bytes === 0) {
    return "0KB";
  }

  if (bytes < BYTES_PER_MB) {
    return `${Math.max(1, Math.round(bytes / BYTES_PER_KB))}KB`;
  }

  return `${(bytes / BYTES_PER_MB).toFixed(1)}MB`;
}

export function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
