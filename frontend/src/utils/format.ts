export function formatCurrency(value: string | number | null | undefined, currency = 'USD'): string {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

export function formatNumber(value: string | number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPercent(value: string | number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(decimals)}%`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
