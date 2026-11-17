/**
 * The real nth root of x for a finite, nonzero real degree n.
 * Negative radicands require an odd integer degree; unsupported domains return
 * NaN. Negative degrees take reciprocal roots. Degrees 2 and 3 use the native
 * square and cube roots, preserving sqrt behavior and exact simple cube roots.
 * Other degrees use exponentiation with the signed reciprocal degree, avoiding
 * an overflowing positive root before a representable reciprocal result.
 */
export function nthRoot(x: number, n: number): number {
  if (!Number.isFinite(n) || n === 0) return Number.NaN;
  if (x < 0 && (!Number.isInteger(n) || n % 2 === 0)) return Number.NaN;
  if (x === 1) return 1;

  const degree = Math.abs(n);
  if (degree === 1) return n < 0 ? 1 / x : x;
  if (degree === 2 || degree === 3) {
    const root = degree === 2 ? Math.sqrt(x) : Math.cbrt(x);
    return n < 0 ? 1 / root : root;
  }
  return x < 0 ? -((-x) ** (1 / n)) : x ** (1 / n);
}
