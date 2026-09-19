import { describe, expect, it } from 'vitest';
import {
  formatCurrencyUSD,
  formatFixed,
  formatInteger,
} from '#lib/text/format.js';

describe('number formatting', () => {
  it('shares explicit USD cents and grouping across financial summaries', () => {
    expect(formatCurrencyUSD(125000)).toBe('$125,000.00');
    expect(formatCurrencyUSD(4659.375)).toBe('$4,659.38');
    expect(formatCurrencyUSD(-12.5)).toBe('-$12.50');
  });
  it('formats fixed-point decimals', () => {
    expect(formatFixed(12.345, 1)).toBe('12.3');
    expect(formatFixed(12.3, 2)).toBe('12.30');
  });

  it('formats integers with locale separators', () => {
    expect(formatInteger(9500)).toBe(new Intl.NumberFormat().format(9500));
  });

  it('retains finite-value fallback and native precision bounds', () => {
    expect(formatFixed(Number.NaN, 2)).toBe('0');
    expect(formatFixed(Number.POSITIVE_INFINITY, 2)).toBe('0');
    expect(formatFixed(12.34, -2)).toBe('12');
    expect(formatFixed(12.34, 1.9)).toBe('12.3');
    expect(() => formatFixed(12, 101)).toThrow(RangeError);
    expect(formatInteger(12.34)).toBe(new Intl.NumberFormat().format(12.34));
  });
});
