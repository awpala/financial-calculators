const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Format caller-validated finite USD amounts with en-US grouping and two decimal places. */
export function formatCurrencyUSD(value: number): string {
  return usd.format(value);
}

/**
 * Format a finite number with fixed decimals, or '0' for non-finite values.
 * Precision is floored and clamped to zero; native toFixed still rejects values
 * above 100 and uses exponential notation for magnitudes at least 1e21.
 */
export function formatFixed(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) return '0';
  const safeDigits = Math.max(0, Math.floor(fractionDigits));
  return value.toFixed(safeDigits);
}

/**
 * Format with the runtime's default locale and Intl.NumberFormat defaults.
 * This does not enforce integer input; fractions retain Intl's default precision.
 */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * Format caller-validated non-negative bytes using 1024-based B/KB/MB buckets.
 * KB rounds to an integer and MB to one decimal; there is no larger bucket,
 * localization, or input validation despite the conventional KB/MB labels.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
