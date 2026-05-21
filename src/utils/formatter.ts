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
