import { describe, expect, it } from 'vitest';
import { evaluateProgram } from '#lib/calculator/language/evaluate.js';
import { FUNCTIONS, isReservedName } from '#lib/calculator/language/syntax.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';

function calculate(source: string): number {
  const parsed = parseProgram(source);
  if (parsed.status !== 'valid') throw new Error(JSON.stringify(parsed));
  const evaluated = evaluateProgram(parsed.program);
  if (!evaluated.ok) throw new Error(evaluated.message);
  const value = evaluated.evaluation.value;
  if (typeof value !== 'number') throw new Error('Expected a scalar result');
  return value;
}

describe('calculator mathematical functions', () => {
  it.each([
    ['round(2.5)', 3],
    ['round(-2.5)', -2],
    ['round(2.49)', 2],
    ['min(7)', 7],
    ['max(-4)', -4],
    ['min(4, -2, 8, 3)', -2],
    ['max[4, -2, 8, 3,]', 8],
    ['min(1,000)', 0],
    ['min((1,000), 900)', 900],
    ['max(1_000, 900)', 1000],
    ['max(nCr(5, 2), nPr(5, 2), round(n_root(8, 2)))', 20],
    ['min(sum_i(i, 1, 3), max(2, 4), 10)', 4],
    ['comma, name = 7; max(comma, name, 3)', 7],
    [
      'min(4, # commas, brackets ) in comments do not divide arguments\n 2,)',
      2,
    ],
  ])('evaluates rounding or extrema in %s', (source, expected) => {
    expect(calculate(source)).toBe(expected);
  });

  it.each(['min()', 'max()', 'min(,)', 'max(1,,2)', 'min(1,,)', 'round(1, 2)'])(
    'rejects missing values or wrong arity in %s',
    (source) => {
      expect(parseProgram(source).status).toBe('invalid');
    },
  );

  it('propagates extrema arithmetic and preserves signed zeros', () => {
    expect(calculate('min(1, sqrt(-1), 3)')).toBeNaN();
    expect(calculate('max(1, sqrt(-1), 3)')).toBeNaN();
    expect(calculate('min(1 / 0, 3)')).toBe(3);
    expect(calculate('max(1 / 0, 3)')).toBe(Infinity);
    expect(calculate('min(0, -0)')).toBe(-0);
    expect(calculate('max(-0, 0)')).toBe(0);
    expect(calculate('round(-0.5)')).toBe(-0);
  });

  it('evaluates a variadic call beyond the native function argument limit', () => {
    expect(
      evaluateProgram({
        assignments: [],
        result: {
          kind: 'call',
          name: 'max',
          arguments: Array.from({ length: 150_000 }, (_, value) => ({
            kind: 'number',
            value,
          })),
        },
      }),
    ).toEqual({ ok: true, evaluation: { value: 149_999, bindings: [] } });
  });

  it('evaluates every variadic argument even after an undefined value', () => {
    const parsed = parseProgram('min(sqrt(-1), sum_i(1, 1, 10m + 1))');
    if (parsed.status !== 'valid') throw new Error(JSON.stringify(parsed));
    expect(evaluateProgram(parsed.program)).toMatchObject({ ok: false });
  });

  it.each([
    ['nCr(5, 2)', 10],
    ['nPr(5, 2)', 20],
    ['nCr[200, 2,]', 19_900],
    ['nPr{200, 2}', 39_800],
    ['nCr(1,000, 2)', 499_500],
    ['n = 5; r = 2; nPr(n, r) / nCr(n, r)', 2],
    ['sum_r(nCr(5, r), 0, 5)', 32],
    ['nCr(nPr(3, 2), 2)', 15],
    ['n_root(25, 2)', 5],
    ['n_root(-8, 3)', -2],
    ['n_root(-32, 5)', -2],
    ['n_root(16, -2)', 0.25],
    ['n_root(-8, -3)', -0.5],
    ['n_root(16, 0.5)', 256],
    ['n_root(4, -0.5)', 0.0625],
    ['n_root(0, 2)', 0],
    ['n_root(1, 1 / 10 ^ 308 / 100)', 1],
    ['log_n(1000, 10)', 3],
    ['log_n(1024, 2)', 10],
    ['log_n(e, e)', 1],
    ['log_n(81, 3)', 4],
    ['log_n(8, 0.5)', -3],
    ['log_n(1, 3)', 0],
    ['sin(pi / 2)', 1],
    ['cos(pi)', -1],
    ['tan(pi / 4)', 1],
    ['sec(0)', 1],
    ['csc(pi / 2)', 1],
    ['cot(pi / 4)', 1],
    ['arcsin(1)', Math.PI / 2],
    ['arccos(-1)', Math.PI],
    ['arctan(1)', Math.PI / 4],
    ['arcsec(2)', Math.PI / 3],
    ['arccsc(-2)', -Math.PI / 6],
    ['arccot(-1)', (3 * Math.PI) / 4],
    ['arctan2(1, -1)', (3 * Math.PI) / 4],
    ['sin_d(30)', 0.5],
    ['cos_d(60)', 0.5],
    ['tan_d(45)', 1],
    ['sec_d(60)', 2],
    ['csc_d(30)', 2],
    ['cot_d(45)', 1],
    ['arcsin_d(0.5)', 30],
    ['arccos_d(0.5)', 60],
    ['arctan_d(1)', 45],
    ['arcsec_d(2)', 60],
    ['arccsc_d(-2)', -30],
    ['arccot_d(-1)', 135],
    ['arctan2_d(1, -1)', 135],
    ['arctan2_d(-1, -1)', -135],
    ['sinh(0)', 0],
    ['cosh(0)', 1],
    ['tanh(0)', 0],
    ['sech(0)', 1],
    ['csch(ln(2))', 4 / 3],
    ['coth(ln(2))', 5 / 3],
    ['arcsinh(sinh(-2))', -2],
    ['arccosh(cosh(2))', 2],
    ['arctanh(tanh(-0.5))', -0.5],
    ['arcsech(sech(2))', 2],
    ['arccsch(csch(-2))', -2],
    ['arccoth(coth(-2))', -2],
  ])('evaluates %s', (source, expected) => {
    expect(calculate(source)).toBeCloseTo(expected, 12);
  });

  it.each([
    'nCr(-1, 0)',
    'nCr(5, 6)',
    'nCr(5, 1.5)',
    'nPr(5, -1)',
    'nPr(5.5, 2)',
    'nCr(1 / 0, 1)',
    'nPr(5, 1 / 0)',
    'n_root(4, 0)',
    'n_root(4, 1 / 0)',
    'n_root(-4, 2)',
    'n_root(-8, 1.5)',
    'log_n(8, 1)',
    'log_n(8, 0)',
    'log_n(8, -2)',
    'log_n(8, 1 / 0)',
    'log_n(-8, 2)',
    'arcsin(2)',
    'arccos_d(-2)',
    'arcsec(0.5)',
    'arccsc_d(0)',
    'arccosh(0.5)',
    'arctanh(2)',
    'arcsech(-1)',
    'arccoth(0)',
  ])('leaves domain errors in %s as undefined arithmetic', (source) => {
    expect(calculate(source)).toBeNaN();
  });

  it.each([
    'tan_d(90)',
    'sec_d(270)',
    'csc_d(180)',
    'cot_d(0)',
    'csch(0)',
    'coth(0)',
    'log_n(0, 10)',
    'n_root(0, -2)',
  ])('shows the nonfinite result of %s as undefined', (source) => {
    expect(Number.isFinite(calculate(source))).toBe(false);
  });

  it('preserves sqrt, including negative zero, at degree 2', () => {
    for (const x of [
      0,
      -0,
      2,
      25,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
      Infinity,
      -1,
      NaN,
    ]) {
      expect(FUNCTIONS.n_root.apply(x, 2)).toBe(FUNCTIONS.sqrt.apply(x));
    }
    expect(FUNCTIONS.n_root.apply(10, -1 / 309)).toBeGreaterThan(0);
  });

  it('uses exact quadrantal degree values without losing tiny angles', () => {
    for (const angle of [-720, -360, -180, 0, 180, 360, 720]) {
      expect(FUNCTIONS.sin_d.apply(angle)).toBe(0);
    }
    expect(calculate('sin_d(450)')).toBe(1);
    expect(calculate('sin_d(-270)')).toBe(1);
    expect(calculate('cos_d(90)')).toBe(0);
    expect(calculate('cos_d(-180)')).toBe(-1);
    expect(FUNCTIONS.sin_d.apply(1e-15)).toBeGreaterThan(0);
  });

  it.each(['nCr', 'nPr', 'n_root', 'log_n', 'arctan2', 'arctan2_d'])(
    'requires two arguments for %s',
    (name) => {
      for (const source of [`${name}(5)`, `${name}(5,)`, `${name}(5, 2, 1)`]) {
        expect(parseProgram(source).status).toBe('invalid');
      }
      expect(parseProgram(`${name}(5, 2,)`).status).toBe('valid');
    },
  );

  it.each(Object.keys(FUNCTIONS))(
    'reserves exactly the function spelling %s',
    (name) => {
      expect(isReservedName(name)).toBe(true);
      expect(parseProgram(`${name} = 1;`).status).toBe('invalid');
      expect(parseProgram(`sum_${name}(1, 0, 1)`).status).toBe('invalid');
    },
  );

  it.each([
    'ncr',
    'NCR',
    'npr',
    'NPr',
    'N_root',
    'Log_n',
    'Sin',
    'SIN_d',
    'asin',
    'atan2',
    'asinh',
  ])(
    'keeps %s available as a case-sensitive user name rather than an alias',
    (name) => {
      expect(isReservedName(name)).toBe(false);
      expect(calculate(`${name} = 7; ${name}`)).toBe(7);
      expect(parseProgram(`${name}(1)`).status).toBe('invalid');
    },
  );
});
