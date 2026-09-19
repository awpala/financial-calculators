import { describe, expect, it } from 'vitest';
import {
  formatCalculatedValue,
  formatSuffixedValue,
} from '#lib/calculator/presentation/format.js';

describe('calculated value formatting', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [1234567.891, '1,234,567.891'],
    [-2500, '-2,500'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.3333333333'],
    [0.000001, '0.000001'],
    [1.5e-9, '1.5e-9'],
    [-2e-7, '-2e-7'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatCalculatedValue(value)).toBe(expected);
  });

  it.each([
    [1500, '1.5K'],
    [1000, '1K'],
    [2_500_000, '2.5M'],
    [4e9, '4B'],
    [1.25e12, '1.25T'],
    [-2500, '-2.5K'],
    [999, '999'],
    [-999.5, '-999.5'],
    [0, '0'],
    [1.5e-9, '1.5e-9'],
  ])('abbreviates %d as %s', (value, expected) => {
    expect(formatSuffixedValue(value)).toBe(expected);
  });

  it.each([
    [29_000 / 12_000, '2.417'],
    [29_000 / 12, '2.417K'],
    [1_234_567, '1.235M'],
    [123_456_789_012_345, '123.457T'],
    [1 / 3, '0.333'],
  ])('rounds %d to three decimals, as %s', (value, expected) => {
    expect(formatSuffixedValue(value)).toBe(expected);
  });

  it('drops trailing zeros rather than padding to three decimals', () => {
    expect(formatSuffixedValue(1500)).toBe('1.5K');
    expect(formatSuffixedValue(2000)).toBe('2K');
    expect(formatSuffixedValue(1_250_000)).toBe('1.25M');
    expect(formatSuffixedValue(2.5)).toBe('2.5');
  });

  it('takes the largest magnitude the figure reaches, without rounding past one', () => {
    expect(formatSuffixedValue(1e9)).toBe('1B');
    // Kept exact at its own magnitude rather than rounded up to 1M.
    expect(formatSuffixedValue(999_999)).toBe('999.999K');
    // Rounding would spill to 1,000B, so the next magnitude up says it better.
    expect(formatSuffixedValue(1e12 - 1)).toBe('1T');
  });

  it.each([
    [999.9999, '1K'],
    [-999.9999, '-1K'],
    [999.9994, '999.999'],
    [0.9999, '1'],
  ])(
    'suffixes a figure under a thousand only once it rounds to a thousand, so %d is %s',
    (value, expected) => {
      expect(formatSuffixedValue(value)).toBe(expected);
    },
  );
});
