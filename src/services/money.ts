export function eurosToCents(value: number | string): number {
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(centsToEuros(cents));
}
