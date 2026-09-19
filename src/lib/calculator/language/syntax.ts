import { factorial } from '#lib/calculator/language/factorial.js';
import { readIterationHead } from '#lib/calculator/language/iteration.js';

/** The one-argument functions supported by parsing, evaluation, and highlighting. */
export const FUNCTIONS = {
  /** Base-ten logarithm. */
  log: Math.log10,
  /** Base-two logarithm. */
  lg: Math.log2,
  /** Natural logarithm. */
  ln: Math.log,
  /** Square root. */
  sqrt: Math.sqrt,
  /** Absolute value. */
  abs: Math.abs,
  /** The greatest integer not above the argument. */
  floor: Math.floor,
  /** The least integer not below the argument. */
  ceil: Math.ceil,
  /** Factorial of a non-negative integer; anything else has none. */
  fact: factorial,
  /** Reciprocal, shorthand for `1 / x`. */
  inv: (value: number) => 1 / value,
} as const;

/** A named one-argument function the calculator supports. */
export type CalculatorFunction = keyof typeof FUNCTIONS;

/** The named constants supported by parsing and evaluation. */
export const CONSTANTS = {
  /** Euler's number. */
  e: Math.E,
  /** The ratio of a circle's circumference to its diameter. */
  pi: Math.PI,
  /** The golden ratio, `(1 + √5) / 2`. */
  phi: (1 + Math.sqrt(5)) / 2,
} as const;

/** A named constant the calculator supports. */
export type CalculatorConstant = keyof typeof CONSTANTS;

/** Whether a name identifies a supported one-argument function. */
export function isCalculatorFunction(name: string): name is CalculatorFunction {
  return Object.hasOwn(FUNCTIONS, name);
}

/** Whether a name identifies a supported constant. */
export function isCalculatorConstant(name: string): name is CalculatorConstant {
  return Object.hasOwn(CONSTANTS, name);
}

/**
 * Whether a name is built in and so cannot be bound: a constant, a function, or
 * a sum or product head such as `sum_i`.
 */
export function isReservedName(name: string): boolean {
  return (
    isCalculatorConstant(name) ||
    isCalculatorFunction(name) ||
    readIterationHead(name) !== undefined
  );
}

/** The arithmetic symbols recognized in expressions and editor highlighting. */
export const OPERATOR_SYMBOLS = ['+', '-', '*', '/', '%', '^'] as const;

/** A binary or unary arithmetic operator symbol. */
export type OperatorSymbol = (typeof OPERATOR_SYMBOLS)[number];

/** A character that opens a group. */
export type OpeningBracket = '(' | '[' | '{';

/** A character that closes a group. */
export type ClosingBracket = ')' | ']' | '}';

/** The closing bracket that matches each opening bracket. */
export const MATCHING_BRACKET: Readonly<
  Record<OpeningBracket, ClosingBracket>
> = {
  '(': ')',
  '[': ']',
  '{': '}',
};

const CLOSING_BRACKETS = new Set<string>(Object.values(MATCHING_BRACKET));

/** Whether a character opens a group. */
export function isOpeningBracket(
  char: string | undefined,
): char is OpeningBracket {
  return char !== undefined && Object.hasOwn(MATCHING_BRACKET, char);
}

/** Whether a character closes a group. */
export function isClosingBracket(
  char: string | undefined,
): char is ClosingBracket {
  return char !== undefined && CLOSING_BRACKETS.has(char);
}
