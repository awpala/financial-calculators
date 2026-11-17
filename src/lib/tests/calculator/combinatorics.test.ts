import { describe, expect, it } from 'vitest';
import {
  combinations,
  permutations,
} from '#lib/calculator/language/combinatorics.js';

describe('combinatorial counts', () => {
  it.each([
    [0, 0, 1, 1],
    [5, 0, 1, 1],
    [5, 1, 5, 5],
    [5, 2, 10, 20],
    [5, 5, 1, 120],
    [200, 2, 19_900, 39_800],
    [1e12, 1, 1e12, 1e12],
  ])(
    'counts selections of %d items taken %d at a time',
    (n, r, unordered, ordered) => {
      expect(combinations(n, r)).toBe(unordered);
      expect(permutations(n, r)).toBe(ordered);
    },
  );

  it.each([
    [-1, 0],
    [5, -1],
    [5, 6],
    [5.5, 2],
    [5, 2.5],
    [NaN, 0],
    [5, NaN],
    [Infinity, 1],
    [5, Infinity],
    [-Infinity, 0],
  ])('rejects the selection (%d, %d)', (n, r) => {
    expect(combinations(n, r)).toBeNaN();
    expect(permutations(n, r)).toBeNaN();
  });

  it('uses symmetry for huge selections near n', () => {
    expect(combinations(1e12, 1e12)).toBe(1);
    expect(combinations(1e12, 1e12 - 1)).toBe(1e12);
    expect(combinations(100, 97)).toBe(combinations(100, 3));
  });

  it('keeps representable results finite when factorials or numerator products overflow', () => {
    const count = combinations(1029, 514);
    expect(Number.isFinite(count)).toBe(true);
    expect(count / 1e308).toBeCloseTo(1.429820686498904, 12);
    expect(combinations(1030, 515)).toBe(Infinity);
    expect(combinations(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
    expect(permutations(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
  });

  it('stops enormous overflowing selections promptly', () => {
    expect(combinations(1e12, 5e11)).toBe(Infinity);
    expect(permutations(1e12, 1e12)).toBe(Infinity);
    expect(permutations(171, 171)).toBe(Infinity);
  });
});
