/**
 * Logarithm of x in a finite positive base other than 1.
 * Invalid bases and negative radicands return NaN. Zero and positive infinity
 * follow the existing logarithms' nonfinite behavior. Common bases use their
 * native implementations so base 10, base 2, and base e match log, lg, and ln.
 */
export function logarithm(x: number, base: number): number {
  if (!Number.isFinite(base) || base <= 0 || base === 1) return Number.NaN;
  if (base === 10) return Math.log10(x);
  if (base === 2) return Math.log2(x);
  if (base === Math.E) return Math.log(x);
  return Math.log(x) / Math.log(base);
}
