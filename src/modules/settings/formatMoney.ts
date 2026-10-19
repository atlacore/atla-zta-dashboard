export function formatMoney(amount: number, currency?: string) {
  if (!currency) return String(amount);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}
