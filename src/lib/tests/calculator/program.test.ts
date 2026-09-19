import { describe, expect, it } from 'vitest';
import {
  evaluateProgram,
  type Evaluation,
} from '#lib/calculator/language/evaluate.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import { isReservedName } from '#lib/calculator/language/syntax.js';
import type { Program } from '#lib/calculator/program.js';

function run(source: string): Evaluation {
  const parsed = parseProgram(source);
  if (parsed.status !== 'valid') {
    throw new Error(
      `Expected a valid expression, got ${JSON.stringify(parsed)}`,
    );
  }
  const evaluated = evaluateProgram(parsed.program);
  if (!evaluated.ok) throw new Error(evaluated.message);
  return evaluated.evaluation;
}

function calculate(source: string): number {
  const { value } = run(source);
  if (value === undefined) throw new Error('Expected a result expression');
  return value;
}

function program(source: string): Program {
  const parsed = parseProgram(source);
  if (parsed.status !== 'valid') {
    throw new Error(`Expected a valid program, got ${JSON.stringify(parsed)}`);
  }
  return parsed.program;
}

function invalid(source: string): string {
  const parsed = parseProgram(source);
  if (parsed.status !== 'invalid') {
    throw new Error(`Expected an invalid expression, got ${parsed.status}`);
  }
  return parsed.message;
}

describe('calculator program parsing', () => {
  it.each([
    ['1 + 2', 3],
    ['10 - 4 - 3', 3],
    ['2 * 3 + 4', 10],
    ['2 + 3 * 4', 14],
    ['20 / 4 / 5', 1],
    ['17 % 5', 2],
    ['2 ^ 3 ^ 2', 512],
    ['-2 ^ 2', -4],
    ['2 ^ -1', 0.5],
    ['--5', 5],
    ['+5 - -3', 8],
    ['.5 + 0.25', 0.75],
    ['log(1000)', 3],
    ['lg(8)', 3],
    ['lg[1,024] - log(1k)', 7],
    ['ln(e)', 1],
    ['e', Math.E],
    ['pi', Math.PI],
    ['2 * pi * 3', 6 * Math.PI],
    ['-pi ^ 2', -(Math.PI ** 2)],
    ['ln(e ^ pi)', Math.PI],
    ['phi', (1 + Math.sqrt(5)) / 2],
    ['phi ^ 2 - phi', 1],
    ['1 / phi - (phi - 1)', 0],
    ['(1 + 2) * [3 + {4 - 1}]', 18],
    ['log[100] + ln{e ^ 2}', 4],
    ['sqrt(16)', 4],
    ['sqrt[2] ^ 2', 2],
    ['sqrt(3 ^ 2 + 4 ^ 2)', 5],
    ['abs(-3)', 3],
    ['abs{2 - 5} * 2', 6],
    ['-abs(-3)', -3],
    ['abs(-2) ^ 2', 4],
    ['sqrt(abs(-9))', 3],
    ['floor(2.7)', 2],
    ['floor(-2.5)', -3],
    ['ceil(2.1)', 3],
    ['ceil(-2.5)', -2],
    ['ceil[$1,234.56 / 100] * 100', 1300],
    ['floor{7 / 2} + ceil(7 / 2)', 7],
    ['fact(5)', 120],
    ['fact(0)', 1],
    ['fact(5) / fact(3)', 20],
    ['fact[4] ^ 2', 576],
    ['-fact(3)', -6],
    ['inv(4)', 0.25],
    ['inv(inv(8))', 8],
    ['inv[0.5] * 3', 6],
    ['2 ^ inv(2)', Math.SQRT2],
    ['inv(-2k)', -0.0005],
    ['((((2))))', 2],
  ])('evaluates %s', (source, expected) => {
    expect(calculate(source)).toBeCloseTo(expected, 12);
  });

  it.each([
    ['1k', 1000],
    ['1K', 1000],
    ['$1.5k', 1500],
    ['2,500K', 2_500_000],
    ['.5k', 500],
    ['3m', 3_000_000],
    ['0.25M', 250_000],
    ['4b', 4_000_000_000],
    ['1_250B', 1.25e12],
    ['5t', 5e12],
    ['1.234_5T', 1.2345e12],
    ['-2k', -2000],
    ['1k + 1', 1001],
    ['2k * 3', 6000],
    ['$1k - $250', 750],
    ['(1k)', 1000],
    ['2 ^ 1k', 2 ** 1000],
  ])('reads the magnitude suffix in %s', (source, expected) => {
    expect(calculate(source)).toBe(expected);
  });

  it.each([
    ['1kg', "Missing operator before 'kg' on line 1"],
    ['1kk', "Missing operator before 'kk' on line 1"],
    ['1k2', "Missing operator before 'k2' on line 1"],
    ['1 k', "Missing operator before 'k' on line 1"],
    ['1x', "Missing operator before 'x' on line 1"],
    ['1k_', "Missing operator before 'k_' on line 1"],
  ])('refuses %j rather than reading a magnitude', (source, message) => {
    expect(invalid(source)).toBe(message);
  });

  it.each([
    ['1km', "Missing operator before 'km' on line 1"],
    ['1MK', "Missing operator before 'MK' on line 1"],
    ['2.5bt', "Missing operator before 'bt' on line 1"],
    ['(1k)m', "Missing operator before 'm' on line 1"],
    ['m = 2;\n1km', "Missing operator before 'km' on line 2"],
  ])(
    'refuses the stacked suffixes in %j rather than compounding them',
    (source, message) => {
      // A figure takes at most one magnitude, so `km` is never 10^3 * 10^6.
      expect(invalid(source)).toBe(message);
    },
  );

  it('applies one suffix to each figure of an expression', () => {
    expect(calculate('2k * 3m')).toBe(6e9);
  });

  it('leaves declared names alone, whatever a figure would make of them', () => {
    // The suffix is an expression rule. A name is matched before a number is,
    // so a member who declares `2k` gets their own value back, not 2,000.
    expect(run('2k = 5;\n2k + 1')).toEqual({
      value: 6,
      bindings: [{ name: '2k', value: 5 }],
    });
    expect(calculate('k rate = 2;\nk rate * 1k')).toBe(2000);
  });

  it('ignores digit separators and dollar signs', () => {
    expect(calculate('$1,250.50 + 1_000 - $0.5')).toBe(2250);
    expect(calculate('-$50')).toBe(-50);
    expect(calculate('1,234.567_8')).toBe(1234.5678);
  });

  it('joins lines into one expression and skips comments', () => {
    const source = [
      '# assets',
      '$1,000 + 500 # checking and savings',
      '',
      '   # liabilities',
      '- (200 +',
      '  100)',
    ].join('\n');
    expect(calculate(source)).toBe(1200);
  });

  it('treats blank and comment-only input as empty rather than invalid', () => {
    expect(parseProgram('# a = 1; b = 2;')).toEqual({ status: 'empty' });
    expect(parseProgram('')).toEqual({ status: 'empty' });
    expect(parseProgram('  \n\t ')).toEqual({ status: 'empty' });
    expect(parseProgram('# nothing yet\n# still nothing')).toEqual({
      status: 'empty',
    });
  });

  it('leaves undefined arithmetic to JavaScript', () => {
    expect(calculate('1 / 0')).toBe(Infinity);
    expect(calculate('ln(-1)')).toBeNaN();
    expect(calculate('sqrt(-1)')).toBeNaN();
    expect(calculate('fact(2.5)')).toBeNaN();
    expect(calculate('fact(-1)')).toBeNaN();
    expect(calculate('fact(171)')).toBe(Infinity);
    expect(calculate('inv(0)')).toBe(Infinity);
    expect(calculate('5 % 0')).toBeNaN();
  });

  it.each([
    ['(1 + 2', "'(' on line 1 is never closed"],
    ['1 + 2)', "Unmatched ')' on line 1"],
    ['(1 + [2 * 3)]', "'[' on line 1 is closed by ')' on line 1; expected ']'"],
    ['{1\n+ 2]', "'{' on line 1 is closed by ']' on line 2; expected '}'"],
    ['()', "Expected a value before ')' on line 1"],
    ['1 +', 'Expression ends where a value is expected on line 1'],
    ['1 +\n# trailing', 'Expression ends where a value is expected on line 1'],
    ['* 2', "Expected a value before '*' on line 1"],
    ['1 + * 2', "Expected a value before '*' on line 1"],
    ['2 3', "Missing operator before '3' on line 1"],
    ['2(3)', "Missing operator before '(' on line 1"],
    ['(2)(3)', "Missing operator before '(' on line 1"],
    ['2e', "Missing operator before 'e' on line 1"],
    ['2pi', "Missing operator before 'pi' on line 1"],
    ['2phi', "Missing operator before 'phi' on line 1"],
    ['pi(2)', "Missing operator before '(' on line 1"],
    ['(1 2)', "Missing operator before '2' on line 1"],
    ['1$2', "Missing operator before '2' on line 1"],
    ['E', "'E' is not declared by an earlier statement on line 1"],
    ['PI', "'PI' is not declared by an earlier statement on line 1"],
    ['Phi', "'Phi' is not declared by an earlier statement on line 1"],
    ['pie', "'pie' is not declared by an earlier statement on line 1"],
    ['Log(10)', "'Log' is not declared by an earlier statement on line 1"],
    [
      'log_10(10)',
      "'log_10' is not declared by an earlier statement on line 1",
    ],
    ['log_2(8)', "'log_2' is not declared by an earlier statement on line 1"],
    ['LG(8)', "'LG' is not declared by an earlier statement on line 1"],
    ['lg 8', "'lg' must be followed by a parenthesized argument on line 1"],
    ['sqrt 4', "'sqrt' must be followed by a parenthesized argument on line 1"],
    ['abs -2', "'abs' must be followed by a parenthesized argument on line 1"],
    ['2sqrt(4)', "Missing operator before 'sqrt' on line 1"],
    ['Abs(1)', "'Abs' is not declared by an earlier statement on line 1"],
    [
      'floor 2.5',
      "'floor' must be followed by a parenthesized argument on line 1",
    ],
    ['ceil', "'ceil' must be followed by a parenthesized argument on line 1"],
    ['fact 5', "'fact' must be followed by a parenthesized argument on line 1"],
    ['inv 2', "'inv' must be followed by a parenthesized argument on line 1"],
    ['5!', "Unexpected '!' on line 1"],
    ['x_2', "'x_2' is not declared by an earlier statement on line 1"],
    ['_x', "'_' must sit between digits or within a name on line 1"],
    ['1_ + 2', "'_' must sit between digits on line 1"],
    ['sin(1)', "'sin' is not declared by an earlier statement on line 1"],
    ['log 10', "'log' must be followed by a parenthesized argument on line 1"],
    ['1 +\nln', "'ln' must be followed by a parenthesized argument on line 2"],
    ['1 = 1', "'1' reads as a number and cannot be declared on line 1"],
    ['1 < 2', "Unexpected '<' on line 1"],
    ['1,,000', "',' must sit between digits on line 1"],
    ['1, 2', "',' must sit between digits on line 1"],
    [', 2', "',' must sit between digits on line 1"],
    ['_5', "'_' must sit between digits or within a name on line 1"],
    ['1_.5', "'_' must sit between digits on line 1"],
    ['1.2.3', 'A number has more than one decimal point on line 1'],
    ['5.', 'A decimal point must be followed by a digit on line 1'],
    ['1 + .', 'A decimal point must be followed by a digit on line 1'],
    [
      '1 +\n\n2 +\n3..5',
      'A decimal point must be followed by a digit on line 4',
    ],
  ])('rejects %j', (source, message) => {
    expect(invalid(source)).toBe(message);
  });

  describe('statements', () => {
    it('assigns names for later statements and results in the trailing expression', () => {
      const source = [
        '# income',
        'pre_tax = $1,000;',
        'tax_rate = 0.25;',
        'post_tax = pre_tax * (1 - tax_rate);',
        '# net of rent',
        'post_tax - $300',
      ].join('\n');

      expect(run(source)).toEqual({
        value: 450,
        bindings: [
          { name: 'pre_tax', value: 1000 },
          { name: 'tax_rate', value: 0.25 },
          { name: 'post_tax', value: 750 },
        ],
      });
    });

    it('takes a last declaration without its semicolon, as names alone', () => {
      expect(run('x = 5')).toEqual({
        value: undefined,
        bindings: [{ name: 'x', value: 5 }],
      });
      expect(run('a = 1;\nb = a + 1')).toEqual({
        value: undefined,
        bindings: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
        ],
      });
      expect(run('x = 1;\ny = 2')).toEqual(run('x = 1;\ny = 2;'));
      expect(run('# note\nsubtotal = 2.5k + 500 # inline')).toEqual({
        value: undefined,
        bindings: [{ name: 'subtotal', value: 3000 }],
      });
    });

    it('has no result when the input only assigns', () => {
      expect(run('a = 2; b = a ^ 3;')).toEqual({
        value: undefined,
        bindings: [
          { name: 'a', value: 2 },
          { name: 'b', value: 8 },
        ],
      });
    });

    it('reads several statements on one line', () => {
      expect(run('assets = $100k; liabilities = $50k;')).toEqual({
        value: undefined,
        bindings: [
          { name: 'assets', value: 100_000 },
          { name: 'liabilities', value: 50_000 },
        ],
      });
      expect(run('assets = $100k; liabilities = $50k')).toEqual(
        run('assets = $100k; liabilities = $50k;'),
      );
      expect(calculate('a = 2; b = 3; a * b')).toBe(6);
      expect(calculate('a = 2; b = 3; a * b;')).toBe(6);
    });

    it('reads one statement across several lines, mixed with statements sharing a line', () => {
      const source = [
        'rent = $1,200; utilities = $150;',
        'monthly = rent',
        '  + utilities; # both',
        'annual = monthly',
        '  * 12; monthly',
        '  * 2',
      ].join('\n');

      expect(run(source)).toEqual({
        value: 2700,
        bindings: [
          { name: 'rent', value: 1200 },
          { name: 'utilities', value: 150 },
          { name: 'monthly', value: 1350 },
          { name: 'annual', value: 16_200 },
        ],
      });
    });

    it('reads the declared name only as a declaration, never as a reference', () => {
      expect(run('total = 10; doubled = total * 2; doubled + total')).toEqual({
        value: 30,
        bindings: [
          { name: 'total', value: 10 },
          { name: 'doubled', value: 20 },
        ],
      });
    });

    it('reads names case-sensitively, with digits and underscores', () => {
      expect(calculate('q1_total = 5; Q1_total = 7; q1_total - Q1_total')).toBe(
        -2,
      );
    });

    it('keeps undefined arithmetic in a binding rather than rejecting it', () => {
      const { value, bindings } = run('broken = 1 / 0; broken - broken');
      expect(bindings).toEqual([{ name: 'broken', value: Infinity }]);
      expect(value).toBeNaN();
    });

    it('declares names with spaces, symbols, and any script', () => {
      const source = [
        '# assets',
        'assets new = $1,000;',
        'assets_new = 500;',
        'net (after tax) = assets new * 0.75;',
        'café € = 2;',
        'assets new + assets_new - net (after tax) * café €',
      ].join('\n');

      expect(run(source)).toEqual({
        value: 0,
        bindings: [
          { name: 'assets new', value: 1000 },
          { name: 'assets_new', value: 500 },
          { name: 'net (after tax)', value: 750 },
          { name: 'café €', value: 2 },
        ],
      });
    });

    it('ends the result with a semicolon or not', () => {
      expect(calculate('5;')).toBe(5);
      expect(calculate('$1,000 + 250;\n# trailing note')).toBe(1250);
      expect(run('x = 1;\nx + 1;')).toEqual({
        value: 2,
        bindings: [{ name: 'x', value: 1 }],
      });
      expect(run('x = 1;\nx + 1')).toEqual(run('x = 1;\nx + 1;'));
    });

    it('accepts an unspaced equals sign', () => {
      expect(run('total=5;total*2')).toEqual({
        value: 10,
        bindings: [{ name: 'total', value: 5 }],
      });
    });

    it.each([
      'assets = $10k;',
      'assets=$10k;',
      'assets =$10k;',
      'assets= $10k;',
      'assets  =   $10k;',
      'assets\t=\t$10k;',
      'assets = \n$10k;',
      'assets =\n\n  $10k;',
      'assets\n= $10k;',
      '  assets  \n  =  \n  $10k  ;',
    ])('reads any whitespace around the equals sign in %j', (source) => {
      expect(run(source)).toEqual({
        value: undefined,
        bindings: [{ name: 'assets', value: 10_000 }],
      });
    });

    it('keeps whitespace within a name, but not around it', () => {
      expect(run('net  worth   = 5;\nnet worth * 2')).toEqual({
        value: 10,
        bindings: [{ name: 'net worth', value: 5 }],
      });
      expect(invalid('net worth = 5;\nnetworth')).toBe(
        "'networth' is not declared by an earlier statement on line 2",
      );
    });

    it('reads a name as trimmed, uncommented, with whitespace runs as one space', () => {
      const source = '# heading\n  gross   pay # note\n = 10;\ngross\n pay + 1';
      expect(run(source)).toEqual({
        value: 11,
        bindings: [{ name: 'gross pay', value: 10 }],
      });
      expect(run('  gross   pay = 10;\ngross\n\tpay + 1')).toEqual({
        value: 11,
        bindings: [{ name: 'gross pay', value: 10 }],
      });
    });

    it('prefers the longest declared name that fits', () => {
      expect(calculate('a = 1; a b = 10; a b + a')).toBe(11);
      expect(calculate('x = 2; -x = 7; -x')).toBe(7);
      expect(calculate('x = 2; y = -x; y')).toBe(-2);
    });

    it('prefers a declared name over a constant it begins with', () => {
      expect(calculate('pi rate = 0.5; pi rate * 2')).toBe(1);
      expect(calculate('pie = 2; pie * pi')).toBeCloseTo(2 * Math.PI, 12);
      expect(calculate('pi rate = 0.5; pi * 2')).toBeCloseTo(2 * Math.PI, 12);
    });

    it('does not match a declared name inside a longer word', () => {
      expect(invalid('tax = 1; taxes')).toBe(
        "'taxes' is not declared by an earlier statement on line 1",
      );
      expect(invalid('tax = 1; tax_2')).toBe(
        "'tax_2' is not declared by an earlier statement on line 1",
      );
    });

    it('treats a result with no values as absent', () => {
      expect(parseProgram('$')).toEqual({ status: 'empty' });
      expect(run('a = 1;\n$ # nothing to total')).toEqual({
        value: undefined,
        bindings: [{ name: 'a', value: 1 }],
      });
    });

    it.each([
      ['x', "'x' is not declared by an earlier statement on line 1"],
      ['x = x + 1;', "'x' is not declared by an earlier statement on line 1"],
      [
        'a = b;\nb = 1;',
        "'b' is not declared by an earlier statement on line 1",
      ],
      ['x = 5\nx + 1', "Missing operator before 'x' on line 2"],
      [
        'assets = $100k; liabilities = $50k\nassets - liabilities',
        "Missing operator before 'assets' on line 2",
      ],
      [
        'a = 1; a + 1; b = 2;',
        "Only the last statement can be a bare expression; the one on line 1 must declare a name, as 'name = expression;'",
      ],
      [
        'x = 5\ny = 2;',
        "Found a second '=' on line 2; a statement declares one name, so a ';' may be missing before it",
      ],
      [
        'x = y = 2;',
        "Found a second '=' on line 1; a statement declares one name, so a ';' may be missing before it",
      ],
      ['x = (5;', "'(' on line 1 is never closed"],
      ['x = 5);', "Unmatched ')' on line 1"],
      [';', "Expected a statement before ';' on line 1"],
      [
        '1;\n2',
        "Only the last statement can be a bare expression; the one on line 1 must declare a name, as 'name = expression;'",
      ],
      [
        'x = 1;\n# subtotal\nx + 1;\ny = 2;',
        "Only the last statement can be a bare expression; the one on line 3 must declare a name, as 'name = expression;'",
      ],
      [
        'x = 1;\nx + 1;\nx + 2;',
        "Only the last statement can be a bare expression; the one on line 2 must declare a name, as 'name = expression;'",
      ],
      ['5;;', "Expected a statement before ';' on line 1"],
      ['x = 1;\n# note\n;', "Expected a statement before ';' on line 3"],
      ['x = ;', "Expected a value after '=' on line 1"],
      ['x = # nothing\n;', "Expected a value after '=' on line 1"],
      ['x=;', "Expected a value after '=' on line 1"],
      ['= 5;', "Expected a name before '=' on line 1"],
      ['# only a comment\n= 5;', "Expected a name before '=' on line 2"],
      ['100 = 5;', "'100' reads as a number and cannot be declared on line 1"],
      [
        '$1,000.50 = 5;',
        "'$1,000.50' reads as a number and cannot be declared on line 1",
      ],
      ['a = 1; a = 2;', "'a' on line 1 is already declared on line 1"],
      [
        'total = 10;\ntotal = total * 2;',
        "'total' on line 2 is already declared on line 1",
      ],
      [
        'gross pay = 1;\ngross   pay = 2;',
        "'gross pay' on line 2 is already declared on line 1",
      ],
      ['lg = 3;', "'lg' is built in and cannot be declared on line 1"],
      ['sqrt = 3;', "'sqrt' is built in and cannot be declared on line 1"],
      ['abs = 3;', "'abs' is built in and cannot be declared on line 1"],
      ['floor = 3;', "'floor' is built in and cannot be declared on line 1"],
      ['ceil = 3;', "'ceil' is built in and cannot be declared on line 1"],
      ['fact = 3;', "'fact' is built in and cannot be declared on line 1"],
      ['inv = 3;', "'inv' is built in and cannot be declared on line 1"],
      ['x = 1; x(2)', "Missing operator before '(' on line 1"],
      ['x = 1; x y', "Missing operator before 'y' on line 1"],
      ['x = 1; 2 x', "Missing operator before 'x' on line 1"],
    ])('rejects %j', (source, message) => {
      expect(invalid(source)).toBe(message);
    });

    it.each([
      ['e = 3;', 'e', 1],
      ['pi = 3;', 'pi', 1],
      ['pi=3', 'pi', 1],
      ['  pi\n= 3.14;', 'pi', 2],
      ['pi # half of tau\n= 3.14;', 'pi', 2],
      ['r = 1;\npi = r * 3;', 'pi', 2],
      ['r = 1;\ne = r;\ne * 2', 'e', 2],
      ['phi = 1.618;', 'phi', 1],
      ['golden = 1.618;\n  phi\t=  golden', 'phi', 2],
    ])('refuses to redefine a constant in %j', (source, name, line) => {
      expect(invalid(source)).toBe(
        `'${name}' is a built-in constant and cannot be redefined on line ${line}`,
      );
    });

    it('reserves exactly the constants and the functions', () => {
      for (const name of [
        'e',
        'pi',
        'phi',
        'log',
        'lg',
        'ln',
        'sqrt',
        'abs',
        'floor',
        'ceil',
        'fact',
        'inv',
        'sum_i',
        'prod_j',
        'sum_total',
      ]) {
        expect(isReservedName(name)).toBe(true);
      }
      for (const name of [
        'E',
        'PI',
        'Pi',
        'π',
        'PHI',
        'φ',
        'exp',
        'log_2',
        'SQRT',
        'Abs',
        'absolute',
        'Floor',
        'ceiling',
        'factor',
        'Fact',
        'invest',
        'Inv',
        'log_10',
        'pre_tax',
        'sum',
        'prod',
        'sum_',
        'sum_2023',
        'Sum_i',
        'sum_i total',
      ]) {
        expect(isReservedName(name)).toBe(false);
      }
    });
  });

  describe('sums and products', () => {
    it.each([
      ['sum_i(i^2,0,2)', 5],
      ['sum_i(i ^ 2, 0, 2)', 5],
      ['prod_j(j+4,-3,5)', 362_880],
      ['prod_j(j + 4, -3, 5)', 362_880],
      ['sum_k[k, 1, 4] + prod_k{k, 1, 4}', 34],
      ['sum_i\n  (i, 1, 3) # spread out', 6],
      ['sum_i(1, 1, 5)', 5],
      ['sum_n2(n2 * 2, 1, 3)', 12],
      ['sum_i_j(i_j, 1, 3)', 6],
      ['prod_α(α, 1, 5)', 120],
      ['sum_i(i, -2, 2)', 0],
      ['sum_i(i, 1, 1k)', 500_500],
      ['sum_i(i, 1_000, 1_002)', 3003],
      ['-sum_i(i, 1, 3) ^ 2', -36],
      ['2 * sum_i(i, 1, 3) + prod_i(i, 1, 3)', 18],
      ['sum_i(inv(2 ^ i), 1, 50)', 1],
    ])('evaluates %j', (source, expected) => {
      expect(calculate(source)).toBeCloseTo(expected, 12);
    });

    it('sums nothing to 0 and multiplies nothing to 1 over an empty range', () => {
      expect(calculate('sum_i(i, 3, 2)')).toBe(0);
      expect(calculate('prod_i(i, 3, 2)')).toBe(1);
      expect(calculate('sum_i(1 / 0, 1, 0)')).toBe(0);
    });

    it('nests, each index readable within its own first argument', () => {
      expect(calculate('sum_i(sum_j(i * j, 1, 3), 1, 3)')).toBe(36);
      expect(calculate('sum_i(prod_j(i + j, 1, 2), 0, 2)')).toBe(20);
      expect(calculate('prod_i(sum_j(j, 1, i), 1, 3)')).toBe(18);
      // An outer index may bound an inner range, since the inner bounds sit
      // within the outer first argument.
      expect(calculate('sum_i(sum_j(i * j, 0, i), 1, 3)')).toBe(1 + 6 + 18);
      expect(
        calculate('sum_i(sum_j(prod_k(i + j + k, 1, 2), 0, 1), 0, 1)'),
      ).toBe(1 * 2 + 2 * 3 + 2 * 3 + 3 * 4);
    });

    it('shadows a declared name, and an outer index, only within the first argument', () => {
      expect(run('i = 100; sum_i(i, 0, 2) + i')).toEqual({
        value: 103,
        bindings: [{ name: 'i', value: 100 }],
      });
      expect(calculate('n = 3; sum_n(n, 1, n)')).toBe(6);
      expect(calculate('sum_i(sum_i(i, 0, 2), 0, 3)')).toBe(12);
      expect(calculate('sum_i(sum_i(i, 0, i), 0, 3)')).toBe(10);
    });

    it('never binds the index as a name', () => {
      expect(run('total = sum_i(i, 1, 4);')).toEqual({
        value: undefined,
        bindings: [{ name: 'total', value: 10 }],
      });
      expect(run('x = sum_i(i, 0, 2);\ni = x * 2;\ni')).toEqual({
        value: 6,
        bindings: [
          { name: 'x', value: 3 },
          { name: 'i', value: 6 },
        ],
      });
    });

    it('evaluates its bounds in the enclosing scope, from names and expressions alike', () => {
      expect(calculate('n = 4; sum_i(i, 1, n)')).toBe(10);
      expect(calculate('sum_i(i, 1, floor(7 / 2))')).toBe(6);
      expect(calculate('sum_i(i, 2 - 3, 1 + 1)')).toBe(2);
    });

    it('groups digits with any comma before its last two', () => {
      expect(calculate('prod_i(3,000 * i, 1, 2)')).toBe(18_000_000);
      expect(calculate('sum_i(1,000,000 * i, 1, 2)')).toBe(3_000_000);
      expect(calculate('sum_i(i * (1,000), 0, 2)')).toBe(3000);
      expect(calculate('sum_i(log(1,000) * i, 0, 2)')).toBe(9);
      expect(calculate('comma, name = 2; sum_i(comma, name * i, 1, 2)')).toBe(
        6,
      );
      // The bounds are whole numbers without grouping; one written with a
      // comma is divided at it, like any of the last two.
      expect(calculate('sum_i(1,000, 5)')).toBe(6);
    });

    it('has no value unless both bounds are whole numbers held exactly', () => {
      expect(calculate('sum_i(i, 0.5, 2)')).toBeNaN();
      expect(calculate('prod_i(i, 1, 2.5)')).toBeNaN();
      expect(calculate('sum_i(i, 1, 1 / 0)')).toBeNaN();
      expect(calculate('sum_i(i, ln(-1), 2)')).toBeNaN();
      expect(calculate('sum_i(1, 2 ^ 53, 2 ^ 53)')).toBeNaN();
      expect(calculate('sum_i(1 / i, 0, 1)')).toBe(Infinity);
    });

    it.each([
      [
        'sum_i(i, 0, i)',
        "'i' is bound only within the first argument of 'sum_i' on line 1",
      ],
      [
        'sum_i(i, i, 2)',
        "'i' is bound only within the first argument of 'sum_i' on line 1",
      ],
      [
        'sum_i(sum_j(j, 0, j), 0, 2)',
        "'j' is bound only within the first argument of 'sum_j' on line 1",
      ],
      [
        'sum_i(i, 0, 2) + i',
        "'i' is not declared by an earlier statement on line 1",
      ],
      [
        'x = sum_i(i, 0, 2);\ni',
        "'i' is not declared by an earlier statement on line 2",
      ],
      [
        'sum_i(j, 0, 2)',
        "'j' is not declared by an earlier statement on line 1",
      ],
      [
        'sum_i(i, 0)',
        "'sum_i' on line 1 takes three arguments, as 'sum_i(expression, start, end)'",
      ],
      [
        'prod_j(j)',
        "'prod_j' on line 1 takes three arguments, as 'prod_j(expression, start, end)'",
      ],
      [
        'sum_i(i, 1, 2, 3)',
        "Only the last two ',' in 'sum_i' separate its arguments, as 'sum_i(expression, start, end)', so the one on line 1 must sit between digits",
      ],
      [
        'sum_i(i, 1,000, 2,000)',
        "Only the last two ',' in 'sum_i' separate its arguments, as 'sum_i(expression, start, end)', so the one on line 1 must sit between digits",
      ],
      ['sum_i(, 0, 2)', "Expected a value before ',' on line 1"],
      ['sum_i(i,, 2)', "Expected a value before ',' on line 1"],
      ['sum_i(i, 0, )', "Expected a value before ')' on line 1"],
      ['sum_i(i 2, 0, 3)', "Missing operator before '2' on line 1"],
      ['sum_i(i, 0, 2', "'(' on line 1 is never closed"],
      [
        'sum_i(i, 0,\n2]',
        "'(' on line 1 is closed by ']' on line 2; expected ')'",
      ],
      ['2 sum_i(i, 0, 2)', "Missing operator before 'sum_i' on line 1"],
      ['sum_i(i, 0, 2)(3)', "Missing operator before '(' on line 1"],
      [
        'sum_i',
        "'sum_i' must be followed by its arguments in brackets, as 'sum_i(expression, start, end)', on line 1",
      ],
      ['sum_i i, 0, 2', "',' must sit between digits on line 1"],
      [
        'sum(i, 0, 2)',
        "'sum' needs an index that starts with a letter, as 'sum_i(expression, start, end)', on line 1",
      ],
      [
        'prod_1(i, 0, 2)',
        "'prod_1' needs an index that starts with a letter, as 'prod_i(expression, start, end)', on line 1",
      ],
      [
        'sum_2023',
        "'sum_2023' is not declared by an earlier statement on line 1",
      ],
      ['sum_pi(pi, 0, 2)', "'pi' is built in and cannot be an index on line 1"],
      [
        'sum_log(1, 0, 2)',
        "'log' is built in and cannot be an index on line 1",
      ],
      [
        'sum_sum_i(1, 0, 2)',
        "'sum_i' is built in and cannot be an index on line 1",
      ],
      ['Sum_i(i)', "'Sum_i' is not declared by an earlier statement on line 1"],
      [
        'sum_total = 5;',
        "'sum_total' reads as a sum over 'total' and cannot be declared on line 1",
      ],
      [
        'prod_x=1',
        "'prod_x' reads as a product over 'x' and cannot be declared on line 1",
      ],
    ])('rejects %j', (source, message) => {
      expect(invalid(source)).toBe(message);
    });

    it('leaves the bare operator words and malformed heads free to declare', () => {
      expect(calculate('sum = 5; prod = 2; sum * prod')).toBe(10);
      expect(calculate('sum_2023 = 7; sum_2023 + sum_i(i, 1, 2)')).toBe(10);
      expect(calculate('sum_i total = 4; sum_i total + sum_i(i, 1, 2)')).toBe(
        7,
      );
    });

    it(`evaluates up to ${(10_000_000).toLocaleString('en-US')} terms in one calculation`, () => {
      expect(calculate('sum_i(1, 1, 10m)')).toBe(10_000_000);
    });

    it.each([
      ['sum_i(i, 1, 1t)', "'sum_i' on line 1"],
      ['sum_i(1, 1, 10m + 1)', "'sum_i' on line 1"],
      ['a = sum_i(1, 1, 6m);\nb = prod_j(1, 1, 4m + 1);', "'prod_j' on line 2"],
      ['sum_i(sum_j(1, 1, 4k), 1, 4k)', "'sum_j' on line 1"],
    ])('stops %j before passing the term limit', (source, at) => {
      expect(evaluateProgram(program(source))).toEqual({
        ok: false,
        message: `${at} would take the sums and products past 10,000,000 terms, the most one calculation evaluates`,
      });
    });
  });
});
