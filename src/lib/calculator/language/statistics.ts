/** Arithmetic mean of finite numeric samples; empty or nonfinite input is undefined. */
export function mean(values: readonly number[]): number {
  if (values.length === 0 || !values.every(Number.isFinite)) return Number.NaN;
  let scale = 0;
  for (const value of values) scale = Math.max(scale, Math.abs(value));
  if (scale === 0) return 0;
  // Normalize before summing to avoid overflow, and retain small contributions
  // when positive and negative values cancel using compensated summation.
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const next = value / scale;
    const sum = total + next;
    correction +=
      Math.abs(total) >= Math.abs(next)
        ? total - sum + next
        : next - sum + total;
    total = sum;
  }
  return ((total + correction) / values.length) * scale;
}

/** Middle sorted sample, or the mean of the middle pair; never mutates the input. */
export function median(values: readonly number[]): number {
  if (values.length === 0 || !values.every(Number.isFinite)) return Number.NaN;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : mean([sorted[middle - 1]!, sorted[middle]!]);
}

/** Most frequent finite sample; ties return the first encountered value, including all-unique input. */
export function mode(values: readonly number[]): number {
  if (values.length === 0 || !values.every(Number.isFinite)) return Number.NaN;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let most = 0;
  let result = Number.NaN;
  for (const value of values) {
    const count = counts.get(value)!;
    if (count > most) {
      most = count;
      result = value;
    }
  }
  return result;
}

/**
 * Standard deviation of finite samples, with divisor n for a population or
 * n - 1 for a sample. A sample needs two observations; a population needs one.
 * Scaled deviations avoid overflow and underflow from squaring raw values.
 */
export function standardDeviation(
  values: readonly number[],
  sample: boolean,
): number {
  const divisor = values.length - (sample ? 1 : 0);
  if (divisor <= 0 || !values.every(Number.isFinite)) return Number.NaN;
  const center = mean(values);
  const half = values.some((value) => !Number.isFinite(value - center));
  const deviation = (value: number) =>
    half ? value / 2 - center / 2 : value - center;
  let scale = 0;
  for (const value of values)
    scale = Math.max(scale, Math.abs(deviation(value)));
  if (scale === 0) return 0;
  let squares = 0;
  for (const value of values) squares += (deviation(value) / scale) ** 2;
  return scale * Math.sqrt(squares / divisor) * (half ? 2 : 1);
}
