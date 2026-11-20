import { describe, expect, it } from 'vitest';
import { evaluateProgram } from '#lib/calculator/language/evaluate.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import {
  mean,
  median,
  mode,
  standardDeviation,
} from '#lib/calculator/language/statistics.js';

function calculate(source: string): number {
  const parsed = parseProgram(source);
  if (parsed.status !== 'valid') throw new Error(JSON.stringify(parsed));
  const outcome = evaluateProgram(parsed.program);
  if (!outcome.ok) throw new Error(outcome.message);
  if (typeof outcome.evaluation.value !== 'number')
    throw new Error('Expected scalar result');
  return outcome.evaluation.value;
}

describe('statistics', () => {
  it.each([
    ['mean(1,2,3,4)', 2.5],
    ['mean(2.5,-3,8)', 2.5],
    ['mean(1,000)', 0.5],
    ['median(9,1,4)', 4],
    ['median(9,1,4,2)', 3],
    ['median(10,2,30)', 10],
    ['mode(4,2,2,4)', 4],
    ['mode(3,1,2)', 3],
    ['mode(2,3,3,4)', 3],
    ['sd_p(2,4,4,4,5,5,7,9)', 2],
    ['sd_s(2,4,4,4,5,5,7,9)', Math.sqrt(32 / 7)],
    ['sd_p(5)', 0],
    ['mean(5)', 5],
    ['median(5)', 5],
    ['mode(5)', 5],
    ['a = [2,4,4,4,5,5,7,9,]; sd_p(*a)', 2],
    ['a = [2,4]; mean(6,*a,8)', 5],
    ['a = [2,4]; median(*a,*a)', 3],
    ['a = []; mean(*a,3)', 3],
    ['a = [1,2,3]; sd_s(*a)', 1],
    ['a = [1,2,3]; sum_i(mean(i * 2, *a), 1, 2)', 4.5],
  ])('evaluates %s', (source, expected) => {
    expect(calculate(source)).toBeCloseTo(expected, 12);
  });

  it.each(['mean', 'median', 'mode', 'sd_p', 'sd_s'])(
    'validates and registers %s throughout the language',
    (name) => {
      for (const source of [
        `${name}()`,
        `a = []; ${name}(*a)`,
        `${name} = 3`,
        `sum_${name}(1,1,2)`,
      ]) {
        expect(parseProgram(source).status).toBe('invalid');
      }
      for (const element of ['1 / 0', 'sqrt(-1)', '-1 / 0']) {
        expect(calculate(`a = [1, ${element}, 3]; ${name}(*a)`)).toBeNaN();
      }
    },
  );

  it('marks an undersized sample undefined without blocking calculation', () => {
    expect(calculate('sd_s(1)')).toBeNaN();
    expect(calculate('a = [1]; sd_s(*a)')).toBeNaN();
  });

  it('does not reorder an array while computing its median or mode', () => {
    const values = Object.freeze([9, 1, 2, 1]);
    expect(median(values)).toBe(1.5);
    expect(mode(values)).toBe(1);
    expect(values).toEqual([9, 1, 2, 1]);
    expect(calculate('a = [4,2,2,4]; middle = median(*a); mode(*a)')).toBe(4);
  });

  it('handles scale, cancellation, and large offsets without avoidable overflow', () => {
    expect(mean([1e308, 1e308])).toBe(1e308);
    expect(mean([1e16, 1, -1e16])).toBeCloseTo(1 / 3, 15);
    expect(median([1e308, 1e308])).toBe(1e308);
    expect(standardDeviation([-1e200, 1e200], false)).toBe(1e200);
    expect(standardDeviation([-1e-200, 1e-200], false)).toBe(1e-200);
    expect(standardDeviation([1e12 + 1, 1e12 + 2, 1e12 + 3], true)).toBe(1);
    expect(standardDeviation([-1e308, 1e308], false)).toBe(1e308);
    expect(standardDeviation([1e308, 1e308], true)).toBe(0);
  });

  it('evaluates all arguments even when an earlier sample is undefined', () => {
    const parsed = parseProgram('mean(sqrt(-1),sum_i(1,1,10m + 1))');
    if (parsed.status !== 'valid') throw new Error(JSON.stringify(parsed));
    expect(evaluateProgram(parsed.program).ok).toBe(false);
  });
});
