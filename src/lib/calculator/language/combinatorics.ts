function validSelection(n: number, r: number): boolean {
  return Number.isInteger(n) && Number.isInteger(r) && r >= 0 && n >= r;
}

/**
 * Count unordered selections of r items from n, without replacement.
 * Both arguments must be nonnegative integers with r <= n; otherwise return NaN.
 * Integer intermediates avoid factorial overflow and rounding before the final
 * conversion to a calculator number. Symmetry and an early infinity return keep
 * even enormous arguments bounded to fewer than 1,024 multiplication steps.
 */
export function combinations(n: number, r: number): number {
  if (!validSelection(n, r)) return Number.NaN;

  const total = BigInt(n);
  const selected = BigInt(r);
  const terms = selected < total - selected ? selected : total - selected;
  let count = 1n;
  for (let i = 1n; i <= terms; i += 1n) {
    count = (count * (total - terms + i)) / i;
    if (!Number.isFinite(Number(count))) return Number.POSITIVE_INFINITY;
  }
  return Number(count);
}

/**
 * Count ordered selections of r items from n, without replacement.
 * Both arguments must be nonnegative integers with r <= n; otherwise return NaN.
 * An empty selection is 1. Integer products round only when converted to the
 * calculator's number type; overflow returns infinity within 171 factors, even
 * when r is enormous, rather than evaluating overflowing factorials.
 */
export function permutations(n: number, r: number): number {
  if (!validSelection(n, r)) return Number.NaN;

  const total = BigInt(n);
  const selected = BigInt(r);
  let count = 1n;
  for (let i = 0n; i < selected; i += 1n) {
    count *= total - i;
    if (!Number.isFinite(Number(count))) return Number.POSITIVE_INFINITY;
  }
  return Number(count);
}
