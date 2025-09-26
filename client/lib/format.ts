export function formatCurrency(locale: string, currency: string | undefined, amount: number | string | null | undefined) {
  const value = Number(amount || 0);
  const cur = currency || 'SAR';
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: cur }).format(value);
  } catch {
    return `${value.toLocaleString(loc)} ${cur}`;
  }
}
