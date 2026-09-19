/**
 * The largest integer whose factorial is finite in double precision; `171!`
 * and above overflow to infinity.
 */
const LARGEST_FINITE_FACTORIAL = 170;

/**
 * The factorial of a non-negative integer: `0!` is 1 and `5!` is 120.
 *
 * Anything else — a fraction, a negative number, or a value that is not finite
 * — has no factorial and yields NaN, which the calculator shows as Undefined
 * rather than refusing the input. An argument past 170 overflows and yields
 * infinity at once instead of multiplying its way there, so a huge argument
 * answers immediately rather than looping once per unit. Past `18!` the product
 * exceeds the integers a double holds exactly, and carries ordinary
 * floating-point rounding like the rest of the calculator's arithmetic.
 */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) return Number.NaN;
  if (n > LARGEST_FINITE_FACTORIAL) return Number.POSITIVE_INFINITY;

  let product = 1;
  for (let factor = 2; factor <= n; factor += 1) product *= factor;
  return product;
}
