import { describe, expect, it } from 'vitest';
import {
  formatNumberInput,
  numberFieldIssues,
  parseNumberInput,
  parsePercentInput,
} from '#lib/calculator/presentation/number-input.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import { evaluateProgram } from '#lib/calculator/language/evaluate.js';

describe('numeric form inputs', () => {
  it.each([
    ['$125k', 125000],
    ['$1,250.50', 1250.5],
    ['1_000.5K', 1000500],
    ['2.5M', 2500000],
    ['.5b', 500000000],
    ['1T', 1000000000000],
    [' + $ .5k ', 500],
    ['-$2k', -2000],
    ['2,00', 200],
    ['0', 0],
  ] as const)('reads %s identically to Scratchpad', (source, expected) => {
    expect(parseNumberInput(source)).toBe(expected);
    const parsed = parseProgram(source);
    expect(parsed.status).toBe('valid');
    if (parsed.status !== 'valid') throw new Error('Expected valid program');
    const evaluated = evaluateProgram(parsed.program);
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) throw new Error(evaluated.message);
    expect(evaluated.evaluation.value).toBe(expected);
  });

  it.each([
    '',
    '$',
    '1.',
    '1,,000',
    '1__000',
    '1kg',
    '1km',
    '1MK',
    '1.5kb',
    '1k2',
    '12x',
    '1 2',
    '1.2.3',
    '20%',
    'Infinity',
    '1e3',
    '2 + 3',
    'a = 5',
    '1'.repeat(400),
  ])('leaves incomplete or non-scalar input %j invalid', (source) => {
    expect(parseNumberInput(source)).toBeNaN();
  });

  it.each([
    0,
    -0.5,
    125000,
    120000 / 2080,
    1e-7,
    5e-324,
    1.234e21,
    -1.234e21,
    Number.MAX_VALUE,
  ])(
    'round-trips a converted value %s without exponent notation or precision loss',
    (value) => {
      const text = formatNumberInput(value);
      expect(text).not.toContain('e');
      expect(parseNumberInput(text)).toBe(value);
    },
  );

  it('reports present but unreadable fields in the order given, leaving blanks out', () => {
    const inputs = {
      a: '$10km',
      b: '',
      c: '  ',
      d: '-5',
      e: '12x',
      f: '$1.5k',
      g: '0.5k',
      h: '100',
    };
    expect(
      numberFieldIssues(
        inputs,
        ['e', 'a', 'b', 'c', 'd', 'f', 'g', 'h'],
        ['b', 'd', 'g', 'h'],
      ),
    ).toEqual([
      { field: 'e', problem: 'malformed' },
      { field: 'a', problem: 'malformed' },
      { field: 'd', problem: 'percent' },
      { field: 'g', problem: 'percent' },
    ]);
  });

  it.each([
    ['0', 0],
    ['6.5', 6.5],
    ['$24', 24],
    ['100', 100],
    ['1_0', 10],
  ])('reads the percentage %j', (source, expected) => {
    expect(parsePercentInput(source)).toBe(expected);
  });

  it.each(['', '-1', '100.01', '0.24k', '1m', '5e1', 'ten', '24%'])(
    'refuses the percentage %j',
    (source) => expect(parsePercentInput(source)).toBeNaN(),
  );
});
