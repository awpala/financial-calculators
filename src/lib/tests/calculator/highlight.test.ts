import { describe, expect, it } from 'vitest';
import {
  highlightInput,
  type HighlightedSegment,
} from '#lib/calculator/presentation/highlight.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import { FUNCTIONS } from '#lib/calculator/language/syntax.js';

function toned(source: string): [string, string][] {
  return highlightInput(source)
    .filter((segment): segment is Required<HighlightedSegment> =>
      Boolean(segment.tone),
    )
    .map((segment) => [segment.tone, segment.text]);
}

function assertLossless(source: string): void {
  expect(
    highlightInput(source)
      .map((segment) => segment.text)
      .join(''),
  ).toBe(source);
}

describe('calculator input highlighting', () => {
  it.each([
    '',
    '1 + 2',
    '# only a comment',
    'x = 1;\nx + 1',
    'gross pay = 1;\n# note\ngross pay * 2;',
    'a = ;;',
  ])('splits %j into runs that rebuild it', (source) => {
    assertLossless(source);
  });

  it('tones comments and operators, leaving figures plain', () => {
    expect(toned('# assets\n1,000 + 250 # note')).toEqual([
      ['comment', '# assets'],
      ['operator', '+'],
      ['comment', '# note'],
    ]);
  });

  it('tones every operator, the functions and the declaring equals sign among them', () => {
    expect(toned('a = log(8) + lg(8) - ln(e) * 2 / 3 ^ 5')).toEqual([
      ['variable', 'a'],
      ['operator', '='],
      ['operator', 'log'],
      ['operator', '+'],
      ['operator', 'lg'],
      ['operator', '-'],
      ['operator', 'ln'],
      ['constant', 'e'],
      ['operator', '*'],
      ['operator', '/'],
      ['operator', '^'],
    ]);
  });

  it.each(Object.entries(FUNCTIONS))(
    'tones the function %s and the commas dividing its arguments',
    (name, { parameters }) => {
      const call = `${name}(${parameters.map((_, at) => at + 1).join(', ')})`;
      expect(toned(`x = 1 + ${call}`)).toEqual([
        ['variable', 'x'],
        ['operator', '='],
        ['operator', '+'],
        ['operator', name],
        ...parameters.slice(1).map((): [string, string] => ['operator', ',']),
      ]);
    },
  );

  it('leaves a percent plain with the figure it ends, toning no remainder of its own', () => {
    expect(toned('rate = 4.5%;\nmod($2k * rate, 10)')).toEqual([
      ['variable', 'rate'],
      ['operator', '='],
      ['operator', 'mod'],
      ['operator', '*'],
      ['variable', 'rate'],
      ['operator', ','],
    ]);
  });

  it("ends a call's first argument at its last comma, leaving a grouping one plain", () => {
    expect(toned('mod(3,000, 7)')).toEqual([
      ['operator', 'mod'],
      ['operator', ','],
    ]);
  });

  it('tones each built-in constant apart from names, operators, and comments', () => {
    expect(toned('total = pi + e + phi; # pi is the ratio')).toEqual([
      ['variable', 'total'],
      ['operator', '='],
      ['constant', 'pi'],
      ['operator', '+'],
      ['constant', 'e'],
      ['operator', '+'],
      ['constant', 'phi'],
      ['comment', '# pi is the ratio'],
    ]);
  });

  it('leaves a logarithm plain where it is part of a declared name', () => {
    expect(toned('log book = 2;\nlog book + log(10)')).toEqual([
      ['variable', 'log book'],
      ['operator', '='],
      ['variable', 'log book'],
      ['operator', '+'],
      ['operator', 'log'],
    ]);
  });

  it('leaves a function name plain inside a longer word', () => {
    expect(
      toned(
        'algebra * lg(8) + absolute - sqrt_2 + ceiling / factor * invoice + abs(1)',
      ),
    ).toEqual([
      ['operator', '*'],
      ['operator', 'lg'],
      ['operator', '+'],
      ['operator', '-'],
      ['operator', '+'],
      ['operator', '/'],
      ['operator', '*'],
      ['operator', '+'],
      ['operator', 'abs'],
    ]);
  });

  it('never tones a bracket or a figure', () => {
    expect(toned('(1 + [2]) * {3}')).toEqual([
      ['operator', '+'],
      ['operator', '*'],
    ]);
  });

  it('tones a declared name where it is declared and wherever it is used', () => {
    expect(toned('pre_tax = 100;\npre_tax * 2 - pre_tax')).toEqual([
      ['variable', 'pre_tax'],
      ['operator', '='],
      ['variable', 'pre_tax'],
      ['operator', '*'],
      ['operator', '-'],
      ['variable', 'pre_tax'],
    ]);
  });

  it('tones each declaration among several on one line', () => {
    expect(
      toned('assets = $100k; liabilities = $50k; assets - liabilities'),
    ).toEqual([
      ['variable', 'assets'],
      ['operator', '='],
      ['variable', 'liabilities'],
      ['operator', '='],
      ['variable', 'assets'],
      ['operator', '-'],
      ['variable', 'liabilities'],
    ]);
  });

  it('tones names that hold spaces, matching any whitespace in a reference', () => {
    expect(toned('net pay = 10;\nnet\n  pay + 1')).toEqual([
      ['variable', 'net pay'],
      ['operator', '='],
      ['variable', 'net\n  pay'],
      ['operator', '+'],
    ]);
  });

  it('tones the name only, not the whitespace around it', () => {
    expect(toned('  total = 5;')).toEqual([
      ['variable', 'total'],
      ['operator', '='],
    ]);
    expect(toned('total=5;')).toEqual([
      ['variable', 'total'],
      ['operator', '='],
    ]);
  });

  it('leaves a reference before its declaration plain', () => {
    expect(toned('later * 2;\nlater = 3;')).toEqual([
      ['operator', '*'],
      ['variable', 'later'],
      ['operator', '='],
    ]);
  });

  it('does not tone a name inside a longer word', () => {
    expect(toned('tax = 1;\ntaxes + tax_2 + tax')).toEqual([
      ['variable', 'tax'],
      ['operator', '='],
      ['operator', '+'],
      ['operator', '+'],
      ['variable', 'tax'],
    ]);
  });

  it('never tones inside a comment', () => {
    expect(toned('x = 1;\n# x is one\nx')).toEqual([
      ['variable', 'x'],
      ['operator', '='],
      ['comment', '# x is one'],
      ['variable', 'x'],
    ]);
  });

  it.each([
    ['e = 1;', 'a built-in name'],
    ['pi = 1;', 'a built-in name'],
    ['phi = 1;', 'a built-in name'],
    ['lg = 1;', 'a built-in function'],
    ['abs = 1;', 'a built-in function'],
    ['100 = 1;', 'a name that reads as a number'],
    ['$1,000 = 1;', 'a figure'],
    [' = 1;', 'an absent name'],
    ['x = y = 1;', 'a statement with two equals signs'],
  ])('declares no name in %j, since it names %s', (source) => {
    expect(toned(source).filter(([tone]) => tone === 'variable')).toEqual([]);
  });

  it('tones the name, not the whitespace flanking its equals sign', () => {
    expect(toned('net  worth \n=\n5;')).toEqual([
      ['variable', 'net  worth'],
      ['operator', '='],
    ]);
  });

  it('tones a name wherever it appears, including a refused second declaration', () => {
    expect(toned('total = 1;\ntotal = 2;\ntotal')).toEqual([
      ['variable', 'total'],
      ['operator', '='],
      ['variable', 'total'],
      ['operator', '='],
      ['variable', 'total'],
    ]);
  });

  it('tones a name used inside a later declaration', () => {
    expect(toned('a = 1;\nb = a + 1;\nb - a')).toEqual([
      ['variable', 'a'],
      ['operator', '='],
      ['variable', 'b'],
      ['operator', '='],
      ['variable', 'a'],
      ['operator', '+'],
      ['variable', 'b'],
      ['operator', '-'],
      ['variable', 'a'],
    ]);
  });

  it('tones a sum or product operator and its separating commas, and its index where it binds and where the first argument reads it', () => {
    expect(toned('sum_i(i^2,0,2) + prod_j(j + 4, -3, 5)')).toEqual([
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['variable', 'i'],
      ['operator', '^'],
      ['operator', ','],
      ['operator', ','],
      ['operator', '+'],
      ['operator', 'prod_'],
      ['variable', 'j'],
      ['variable', 'j'],
      ['operator', '+'],
      ['operator', ','],
      ['operator', '-'],
      ['operator', ','],
    ]);
  });

  it('leaves the index plain in the bounds and after the brackets close', () => {
    expect(toned('sum_i(2, i, i) * i')).toEqual([
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['operator', ','],
      ['operator', ','],
      ['operator', '*'],
    ]);
  });

  it('tones an outer index throughout a nested first argument, bounds included', () => {
    expect(toned('sum_i(sum_j(i * j, 0, i), 1, 3)')).toEqual([
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['operator', 'sum_'],
      ['variable', 'j'],
      ['variable', 'i'],
      ['operator', '*'],
      ['variable', 'j'],
      ['operator', ','],
      ['operator', ','],
      ['variable', 'i'],
      ['operator', ','],
      ['operator', ','],
    ]);
  });

  it('ends the first argument at its last two commas, leaving a grouping one plain', () => {
    expect(toned('prod_i(3,000 * i, 0, 1)')).toEqual([
      ['operator', 'prod_'],
      ['variable', 'i'],
      ['operator', '*'],
      ['variable', 'i'],
      ['operator', ','],
      ['operator', ','],
    ]);
    expect(toned('sum_i(i * (1,000), 0, 2)')).toEqual([
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['variable', 'i'],
      ['operator', '*'],
      ['operator', ','],
      ['operator', ','],
    ]);
  });

  it('ends the first argument of an unclosed sum at its statement', () => {
    expect(toned('x = sum_i(i; i')).toEqual([
      ['variable', 'x'],
      ['operator', '='],
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['variable', 'i'],
    ]);
  });

  it('leaves heads plain inside comments, names, and longer words, and with an unusable index', () => {
    expect(
      toned(
        'my sum_i = 1;\nmy sum_i + sum_pi(pi, 0, 1) + sum_2023 + sum(1) + total_sum_i # sum_i(i, 0, 1)',
      ),
    ).toEqual([
      ['variable', 'my sum_i'],
      ['operator', '='],
      ['variable', 'my sum_i'],
      ['operator', '+'],
      ['constant', 'pi'],
      ['operator', '+'],
      ['operator', '+'],
      ['operator', '+'],
      ['comment', '# sum_i(i, 0, 1)'],
    ]);
  });

  it('tones the index in the first argument past a comment between head and bracket', () => {
    expect(toned('sum_i # squares\n(i ^ 2, 1, 3)')).toEqual([
      ['operator', 'sum_'],
      ['variable', 'i'],
      ['comment', '# squares'],
      ['variable', 'i'],
      ['operator', '^'],
      ['operator', ','],
      ['operator', ','],
    ]);
  });

  it.each(['sum_i(i, 0, 2)', 'x = prod_j(sum_i(i * j, 0, j), 1, 3);\nx'])(
    'splits %j into runs that rebuild it',
    (source) => {
      assertLossless(source);
    },
  );

  it.each(['draft = draft +', 'draft = ; draft'])(
    'keeps an unfinished declaration highlighted while refusing calculation for %j',
    (source) => {
      expect(parseProgram(source).status).toBe('invalid');
      expect(toned(source).filter(([tone]) => tone === 'variable')).toEqual([
        ['variable', 'draft'],
        ['variable', 'draft'],
      ]);
      assertLossless(source);
    },
  );
});
