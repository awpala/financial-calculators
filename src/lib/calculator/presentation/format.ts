/**
 * Present a calculated value for reading and copying, in full or abbreviated.
 */

import {
  MAGNITUDES,
  type Magnitude,
} from '#lib/calculator/language/magnitudes.js';

const MAX_FRACTION_DIGITS = 10;
const SMALLEST_FIXED_MAGNITUDE = 10 ** -6;

const fixed = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: MAX_FRACTION_DIGITS,
});

/**
 * Format a finite calculator result with digit grouping.
 *
 * Fractions are capped at ten digits, which hides floating-point residue such
 * as `0.1 + 0.2` without rounding away cents. A nonzero value too small to
 * survive that cap is written in exponent form rather than shown as zero, and
 * negative zero reads as plain zero.
 */
export function formatCalculatedValue(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) < SMALLEST_FIXED_MAGNITUDE) {
    return value.toExponential(6).replace(/\.?0+e/, 'e');
  }
  return fixed.format(value);
}

const MAX_SUFFIXED_FRACTION_DIGITS = 3;

const abbreviated = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: MAX_SUFFIXED_FRACTION_DIGITS,
});

/**
 * The magnitudes a suffixed figure can take, largest first, ending with the
 * unsuffixed figure a value below a thousand is written as.
 */
const SUFFIXED_MAGNITUDES: readonly Magnitude[] = [...MAGNITUDES, ['', 1]];

/**
 * Format a finite calculator result against the largest magnitude that fits,
 * which is the one that drops the most trailing zeros: 1,500 reads as `1.5K`
 * and 2,500,000 as `2.5M`. A value below a thousand has no magnitude to take
 * and is written out under the same rules.
 *
 * An abbreviation is a figure to read at a glance, so it keeps at most three
 * decimal places and no trailing zeros: `2.41666…` is `2.417`, and `1.5K` stays
 * `1.5K` rather than `1.500K`. That rounding can carry a quotient up to the next
 * magnitude — a hair under a trillion would otherwise read as `1,000B`, and a
 * hair under a thousand as `1,000` — so the magnitude is chosen against the
 * rounded figure.
 */
export function formatSuffixedValue(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) < SMALLEST_FIXED_MAGNITUDE) {
    return formatCalculatedValue(value);
  }

  const reached = SUFFIXED_MAGNITUDES.findIndex(
    ([, scale]) => Math.abs(value) >= scale,
  );
  // A fraction below one reaches no scale at all, so it is written out plainly.
  let index = reached === -1 ? SUFFIXED_MAGNITUDES.length - 1 : reached;
  // Rounding can spill a quotient past a thousand, which would read as
  // `1,000B` where the next magnitude up says `1T`, or `1,000` where `1K` does.
  const spills =
    Math.abs(
      roundToDigits(value / (SUFFIXED_MAGNITUDES[index] as Magnitude)[1]),
    ) >= 1e3;
  if (spills && index > 0) index -= 1;

  const [suffix, scale] = SUFFIXED_MAGNITUDES[index] as Magnitude;
  return `${abbreviated.format(value / scale)}${suffix}`;
}

function roundToDigits(value: number): number {
  const factor = 10 ** MAX_SUFFIXED_FRACTION_DIGITS;
  return Math.round(value * factor) / factor;
}
