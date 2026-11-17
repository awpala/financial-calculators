import { describe, expect, it } from 'vitest';
import {
  ITERATED_OPERATORS,
  iteratedOperatorOf,
  readIterationHead,
  termCount,
} from '#lib/calculator/language/iteration.js';
import { layOutArguments } from '#lib/calculator/parsers/arguments.js';

describe('iteration heads', () => {
  it.each([
    ['sum_i', 'sum', 'i'],
    ['prod_j', 'prod', 'j'],
    ['sum_total', 'sum', 'total'],
    ['sum_n2', 'sum', 'n2'],
    ['sum_i_j', 'sum', 'i_j'],
    ['prod_α', 'prod', 'α'],
    ['sum_pi', 'sum', 'pi'],
  ])('reads %s as the %s over %s', (word, operator, index) => {
    expect(readIterationHead(word)).toEqual({ operator, index });
  });

  it.each([
    'sum',
    'prod',
    'sum_',
    'sum_1',
    'sum_2023',
    'sum__i',
    'Sum_i',
    'SUM_i',
    'summa_i',
    'total_sum',
    'sum_i total',
    'log_2',
  ])('reads no head in %j', (word) => {
    expect(readIterationHead(word)).toBeUndefined();
  });

  it('finds the operator a word calls on, whether or not its index is usable', () => {
    expect(iteratedOperatorOf('sum_i')).toBe('sum');
    expect(iteratedOperatorOf('sum')).toBe('sum');
    expect(iteratedOperatorOf('sum_1')).toBe('sum');
    expect(iteratedOperatorOf('prod_')).toBe('prod');
    for (const word of ['summa', 'Sum_i', 'log', 'x_sum', '']) {
      expect(iteratedOperatorOf(word)).toBeUndefined();
    }
  });

  it('folds terms from the empty-range value', () => {
    const { sum, prod } = ITERATED_OPERATORS;
    expect([2, 3, 4].reduce(sum.combine, sum.empty)).toBe(9);
    expect([2, 3, 4].reduce(prod.combine, prod.empty)).toBe(24);
  });
});

describe('term counts', () => {
  it.each([
    [0, 2, 3],
    [-3, 5, 9],
    [4, 4, 1],
    [3, 2, 0],
    [10, -10, 0],
  ])('counts %d through %d as %d terms', (start, end, expected) => {
    expect(termCount(start, end)).toBe(expected);
  });

  it.each([
    [0.5, 2],
    [0, 2.5],
    [Number.NaN, 2],
    [0, Infinity],
    [-Infinity, 0],
    [0, 2 ** 53],
  ])('has no count from %d through %d', (start, end) => {
    expect(termCount(start, end)).toBeUndefined();
  });
});

describe('argument layout', () => {
  const layOut = (
    text: string,
    skip: (index: number) => number | undefined,
    count = 2,
  ) => layOutArguments(text, 0, text.length, count, skip);
  const skipNothing = () => undefined;

  it('divides at the last two commas directly within the brackets', () => {
    expect(layOut('i^2,0,2)', skipNothing)).toEqual({
      separators: [3, 5],
      end: 7,
    });
    expect(layOut('3,000 * i, 0, 1) + 1', skipNothing)).toEqual({
      separators: [9, 12],
      end: 15,
    });
  });

  it('ignores commas in nested brackets', () => {
    const text = 'f(1,000) * [a, b], 0, 2)';
    expect(layOut(text, skipNothing)).toEqual({
      separators: [17, 20],
      end: text.length - 1,
    });
  });

  it('takes whatever commas there are when there are fewer than two', () => {
    expect(layOut('i, 0)', skipNothing).separators).toEqual([1]);
    expect(layOut('i)', skipNothing).separators).toEqual([]);
  });

  it('divides a two-argument list at its last comma alone', () => {
    expect(layOut('3,000, 7)', skipNothing, 1)).toEqual({
      separators: [5],
      end: 8,
    });
  });

  it('sets aside a trailing comma before choosing separators and retains it for tokenizing', () => {
    expect(layOut('3,000 * i, 0, 1,)', skipNothing)).toEqual({
      separators: [9, 12, 15],
      end: 16,
    });
    expect(layOut('3,000, 7,)', skipNothing, 1)).toEqual({
      separators: [5, 8],
      end: 9,
    });
    expect(layOut('1,000,)', skipNothing, 0)).toEqual({
      separators: [5],
      end: 6,
    });
    expect(layOut('1,000)', skipNothing, 0).separators).toEqual([]);
  });

  it('stops without a closing bracket at the end of its statement or text', () => {
    expect(layOut('i, 0, 2; x = 1', skipNothing)).toEqual({
      separators: [1, 4],
      end: 7,
    });
    expect(layOut('i, 0, 2', skipNothing)).toEqual({
      separators: [1, 4],
      end: 7,
    });
  });

  it('reads nothing inside what it is told to skip', () => {
    const text = 'a, b # 1, 2) ;\n, 0, 2)';
    const comment = text.indexOf('#');
    const skip = (index: number) => {
      if (index === 0) return 4;
      if (index === comment) return text.indexOf('\n');
      return undefined;
    };
    expect(layOut(text, skip)).toEqual({
      separators: [15, 18],
      end: text.length - 1,
    });
  });
});
