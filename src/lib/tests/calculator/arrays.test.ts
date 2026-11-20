import { describe, expect, it } from 'vitest';
import { evaluateProgram } from '#lib/calculator/language/evaluate.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import { highlightInput } from '#lib/calculator/presentation/highlight.js';
import {
  formatCalculatorValue,
  isDefinedValue,
} from '#lib/calculator/presentation/format.js';
import {
  normalizeCalculatorCalculation,
  storeCalculation,
} from '#lib/calculator/persistence/calculation.js';

function evaluate(source: string) {
  const parsed = parseProgram(source);
  if (parsed.status !== 'valid') throw new Error(JSON.stringify(parsed));
  const result = evaluateProgram(parsed.program);
  if (!result.ok) throw new Error(result.message);
  return result.evaluation;
}

describe('numeric arrays and contextual unary unpacking', () => {
  it.each([
    ['[]', []],
    ['[1]', [1]],
    ['[1,]', [1]],
    ['[1,2.5,-3,]', [1, 2.5, -3]],
    ['[1,000]', [1, 0]],
    ['[1_000, (2,000), {3,000}, $2k, 5%]', [1000, 2000, 3000, 2000, 0.05]],
    ['base = 3; [base * 2, sqrt(9), sum_i(i, 1, 3), pi]', [6, 3, 6, Math.PI]],
    ['[1, # trailing comment, [\n]', [1]],
    ['[ # empty\n]', []],
    ['a = [2, 3.5]; alias = (a); alias', [2, 3.5]],
    ['([1,2])', [1, 2]],
  ])('evaluates array %s', (source, expected) => {
    expect(evaluate(source as string).value).toEqual(expected);
  });

  it.each([
    ['max(*[1,2.5,3,])', 3],
    ['max(*[], 5, *[])', 5],
    ['max(*([1,2]))', 2],
    ['a = [1,2]; max(*(a))', 2],
    ['a = [1,2]; max(*{a})', 2],
    ['mod(*[14,4,])', 2],
    ['nCr(*[5], *[2])', 10],
    ['sqrt(*[9])', 3],
    ['max(2 * 3, *[sqrt(4), 5 * 2])', 10],
    ['sum_i(max(*[i, i * 2]), 1, 3)', 12],
    ['mean(*[mean(*[1,2]), 2.5])', 2],
    ['a = [2,3.5]; max(*a)', 3.5],
    ['a = [2,3]; max(2 * 4, *a, 5 * 2)', 10],
    ['a = [2,3]; min(*a, 2 * -4, *a,)', -8],
    ['a = [2,3]; max[*a]', 3],
    ['a = [2,3]; max{*a}', 3],
    ['a = [5,2]; alias = a; nCr(*alias)', 10],
    ['a = [5,2]; nCr(*a)', 10],
    ['a = [5]; b = [2]; nCr(*a,*b,)', 10],
    ['a = [2]; nCr(5,*a)', 10],
    ['a = [5]; nCr(*a,2)', 10],
    ['a = [9]; sqrt(*a)', 3],
    ['a = []; sqrt(*a,9,*a)', 3],
    ['a = []; min(*a,5)', 5],
    ['a = []; max(5,*a,)', 5],
    ['a = [2]; mod((1,000), *a)', 0],
    ['a = [2]; mod(1_000 * 3, *a)', 0],
    ['a = [2]; mod(3 * 1,000, 7)', 4],
    ['name, = 3; mod(name, * 1,000, 7)', 4],
    ['a = [4]; sum_i(max(i * 2, *a), 1, 3)', 14],
    ['a = [4]; sum_i(sqrt(*a) * i, 1, 3)', 12],
    ['a = [4]; sum_i(sum_j(max(i, j, *a), 1, 2), 1, 2)', 16],
    ['sample set = [1,2]; max(*sample   set)', 2],
    ['a,b = [7]; max(*a,b, 2)', 7],
    ['a = [2]; mod(3, # comma,\n * # comment\n a)', 1],
  ])(
    'distinguishes unpacking from multiplication in %s',
    (source, expected) => {
      expect(evaluate(source).value).toBe(expected);
    },
  );

  it.each([
    'max(*["1"])',
    'max(*[true])',
    'max(*[[1]])',
    'max(*[1,,2])',
    'max(*[])',
    'sqrt(*[1,2])',
    'max(*[1] * 2)',
    'max(*3)',
    'max(*sqrt(4))',
    '[,]',
    '[1,,]',
    '[,1]',
    '[1,,2]',
    '[1 2]',
    '[1,2)',
    '[1,',
    '["2"]',
    "['2']",
    '[true]',
    '[null]',
    '[undefined]',
    '[{}]',
    '[[1]]',
    'a = [1]; [a]',
    'a = []; [a]',
    'a = [1]; a + 1',
    '1 + [2]',
    '[1] * 2',
    '2 / [1]',
    '[1] ^ 2',
    '2 ^ [1]',
    '-[1]',
    '+[1]',
    'a = [1]; abs(a)',
    'mean([1,2])',
    'sum_i([i],1,2)',
    'sum_i(i,[],2)',
    'sum_i(i,1,[2])',
    'a = [1]; a[0]',
    'a = [1]; a.length',
    '*a',
    'a = [1]; *a',
    'a = [1]; [*a]',
    'a = 1; max(*a)',
    'max(*missing)',
    'max(*"12")',
    'a = [1]; max(*a * 2)',
    'a = [1]; max(2 * *a)',
    'a = [1]; max(**a)',
    'a = [1]; max(+*a)',
    'a = [1]; max(*a + 2)',
    'a = [1]; (*a)',
    'a = [1]; sum_i(*a,1,2)',
    'i = [1]; sum_i(max(*i),1,2)',
    'a = [1,2]; sqrt(*a)',
    'a = [1]; mod(*a)',
    'a = []; max(*a)',
    'a = [1]; mod(1,000,*a)',
  ])('rejects invalid or nonnumeric use before evaluation: %s', (source) => {
    expect(parseProgram(source).status).toBe('invalid');
  });

  it('reports the unpacking error at its source line', () => {
    expect(parseProgram('a = 2;\nmax(*a)')).toEqual({
      status: 'invalid',
      message:
        "Unpacking '*' requires a numeric array literal or earlier array binding on line 2",
    });
  });

  it('preserves numeric undefined arithmetic and immutable arrays', () => {
    const { value, bindings } = evaluate('a = [1 / 0, sqrt(-1), 2]; a');
    expect(value).toEqual([Infinity, NaN, 2]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(bindings[0]?.value).toBe(value);
    expect(evaluate('a = [1 / 0, 2]; min(*a)').value).toBe(2);
  });

  it('unpacks beyond the native function argument limit', () => {
    const outcome = evaluateProgram({
      assignments: [
        {
          name: 'a',
          line: 1,
          expression: {
            kind: 'array',
            elements: Array.from({ length: 150_000 }, (_, value) => ({
              kind: 'number',
              value,
            })),
          },
        },
      ],
      result: {
        kind: 'call',
        name: 'max',
        arguments: [
          { kind: 'unpack', operand: { kind: 'variable', name: 'a' } },
        ],
      },
    });
    expect(outcome.ok && outcome.evaluation.value).toBe(149_999);
  });

  it('colors array separators, unpacking, and multiplication without coloring protected digit commas', () => {
    const source = 'a = [1, (2,000),]; max(2 * 3, *a)';
    const segments = highlightInput(source);
    expect(segments.map(({ text }) => text).join('')).toBe(source);
    expect(
      segments
        .filter(({ tone }) => tone === 'operator')
        .map(({ text }) => text),
    ).toEqual(['=', ',', ',', 'max', '*', ',', '*']);
    expect(
      highlightInput('sqrt[1,000]')
        .filter(({ tone }) => tone === 'operator')
        .map(({ text }) => text),
    ).toEqual(['sqrt']);
  });
});

describe('array presentation and persistence', () => {
  it('formats arrays unambiguously and preserves undefined elements', () => {
    expect(formatCalculatorValue([1000, -2.5, NaN])).toBe(
      '[1_000, -2.5, Undefined]',
    );
    expect(formatCalculatorValue([1000, -2.5], true)).toBe('[1K, -2.5]');
    expect(formatCalculatorValue([])).toBe('[]');
    expect(formatCalculatorValue(1000)).toBe('1,000');
    expect(isDefinedValue([])).toBe(true);
    expect(isDefinedValue([1, NaN])).toBe(false);
    expect(evaluate(formatCalculatorValue([1000, -2.5])).value).toEqual([
      1000, -2.5,
    ]);
  });

  it('round-trips arrays and aliases, including nonfinite entries', () => {
    const source = 'a = [2.5, 1 / 0]; b = a; a';
    const original = evaluate(source);
    const stored = JSON.parse(
      JSON.stringify(storeCalculation(source, original)),
    );
    expect(stored.value).toEqual([2.5, null]);
    const restored = normalizeCalculatorCalculation(stored, source);
    expect(restored?.value).toEqual([2.5, NaN]);
    expect(restored?.bindings.map(({ value }) => value)).toEqual([
      [2.5, NaN],
      [2.5, NaN],
    ]);
    expect(Object.isFrozen(restored?.value)).toBe(true);
  });

  it.each([['1'], [true], [[1]], [{}], [undefined], { 0: 1, length: 1 }])(
    'rejects malformed stored values %j',
    (invalid) => {
      expect(
        normalizeCalculatorCalculation(
          { source: 'a', value: invalid, bindings: [] },
          'a',
        ),
      ).toBeUndefined();
      expect(
        normalizeCalculatorCalculation(
          { source: 'a', bindings: [{ name: 'a', value: invalid }] },
          'a',
        ),
      ).toBeUndefined();
    },
  );
});
