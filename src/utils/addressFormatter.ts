export interface Address {
  addressLine1: string;
  addressLine2?: string | null;
  townOrCity: string;
  county?: string | null;
  postcode: string;
}

export function formatAddressToHtml(
  address: Address | null | undefined,
): string {
  if (!address) {
    return "";
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postcode,
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .map(escapeHtml)
    .join("<br>");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
