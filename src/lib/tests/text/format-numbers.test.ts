import { describe, expect, it } from 'vitest';
import { formatFixed, formatInteger } from '#lib/text/format.js';

describe('number formatting', () => {
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
