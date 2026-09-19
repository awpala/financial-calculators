import { describe, expect, it } from 'vitest';
import { factorial } from '#lib/calculator/language/factorial.js';

describe('factorial', () => {
  it.each([
    [0, 1],
    [-0, 1],
    [1, 1],
    [2, 2],
    [5, 120],
    [10, 3_628_800],
    [18, 6_402_373_705_728_000],
  ])('takes %d! as %d', (n, expected) => {
    expect(factorial(n)).toBe(expected);
  });

  it('stays finite through 170! and overflows past it', () => {
    expect(factorial(170)).toBeCloseTo(7.257415615307994e306, -290);
    expect(Number.isFinite(factorial(170))).toBe(true);
    expect(factorial(171)).toBe(Infinity);
  });

  it('answers a huge argument at once rather than multiplying toward it', () => {
    expect(factorial(1e12)).toBe(Infinity);
  });

  it.each([-1, -5, 2.5, 0.1, Number.NaN, Infinity, -Infinity])(
    'has no factorial for %d',
    (n) => {
      expect(factorial(n)).toBeNaN();
    },
  );
});
