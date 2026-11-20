import {
  mean,
  median,
  mode,
  standardDeviation,
} from '#lib/calculator/language/statistics.js';
import { factorial } from '#lib/calculator/language/factorial.js';
import {
  combinations,
  permutations,
} from '#lib/calculator/language/combinatorics.js';
import { nthRoot } from '#lib/calculator/language/nth-root.js';
import { logarithm } from '#lib/calculator/language/logarithm.js';
import { TRIGONOMETRIC_FUNCTIONS } from '#lib/calculator/language/trigonometry.js';
import {
  ARGUMENT_SEPARATOR,
  ITERATION_PARAMETERS,
  iteratedOperatorOf,
  readIterationHead,
} from '#lib/calculator/language/iteration.js';

/** A built-in function: the parameters it names between its brackets, and the arithmetic it applies to them. */
export type BuiltInFunction = {
  /** The parameters in order, one per argument, as the messages name them. */
  parameters: readonly string[];
  /** Whether one or more scalar arguments are accepted; defaults to false. */
  variadic?: boolean;
} & (
  | {
      /** Apply ordered values, or fold pairs for a variadic function. */
      apply: (...values: number[]) => number;
      /** Pairwise functions do not consume a complete collection. */
      aggregate?: never;
    }
  | {
      /** Consume the complete argument collection without native argument spreading. */
      aggregate: (values: readonly number[]) => number;
      /** Collection functions do not fold pairs. */
      apply?: never;
    }
);

/** The functions supported by parsing, evaluation, and highlighting, each with the parameters it takes. */
export const FUNCTIONS = {
  /** Base-ten logarithm. */
  log: { parameters: ['x'], apply: Math.log10 },
  /** Base-two logarithm. */
  lg: { parameters: ['x'], apply: Math.log2 },
  /** Natural logarithm. */
  ln: { parameters: ['x'], apply: Math.log },
  /** Logarithm in a finite positive base other than 1. */
  log_n: { parameters: ['x', 'base'], apply: logarithm },
  /** Square root. */
  sqrt: { parameters: ['x'], apply: Math.sqrt },
  /** Real nth root; a negative degree takes a reciprocal root. */
  n_root: { parameters: ['x', 'n'], apply: nthRoot },
  /** Absolute value. */
  abs: { parameters: ['x'], apply: Math.abs },
  /** The greatest integer not above the argument. */
  floor: { parameters: ['x'], apply: Math.floor },
  /** The least integer not below the argument. */
  ceil: { parameters: ['x'], apply: Math.ceil },
  /** Nearest integer, with half ties toward positive infinity. */
  round: { parameters: ['x'], apply: Math.round },
  /** The least of one or more values, retaining nonfinite arithmetic. */
  min: { parameters: ['x'], variadic: true, apply: Math.min },
  /** The greatest of one or more values, retaining nonfinite arithmetic. */
  max: { parameters: ['x'], variadic: true, apply: Math.max },
  /** Arithmetic mean of one or more finite values. */
  mean: { parameters: ['x'], variadic: true, aggregate: mean },
  /** Middle sorted value, averaging the middle pair for even counts. */
  median: { parameters: ['x'], variadic: true, aggregate: median },
  /** Most frequent value, resolving ties by first appearance. */
  mode: { parameters: ['x'], variadic: true, aggregate: mode },
  /** Population standard deviation, dividing squared deviations by n. */
  sd_p: {
    parameters: ['x'],
    variadic: true,
    aggregate: (values: readonly number[]) => standardDeviation(values, false),
  },
  /** Sample standard deviation, dividing by n - 1; a singleton is undefined. */
  sd_s: {
    parameters: ['x'],
    variadic: true,
    aggregate: (values: readonly number[]) => standardDeviation(values, true),
  },
  /** Factorial of a non-negative integer; anything else has none. */
  fact: { parameters: ['x'], apply: factorial },
  /** Unordered selections of r items from n without replacement. */
  nCr: { parameters: ['n', 'r'], apply: combinations },
  /** Ordered selections of r items from n without replacement. */
  nPr: { parameters: ['n', 'r'], apply: permutations },
  /** Reciprocal, shorthand for `1 / x`. */
  inv: { parameters: ['x'], apply: (value: number) => 1 / value },
  /** The remainder after dividing, whose sign follows the dividend. */
  mod: {
    parameters: ['dividend', 'divisor'],
    apply: (dividend: number, divisor: number) => dividend % divisor,
  },
  ...TRIGONOMETRIC_FUNCTIONS,
} as const satisfies Readonly<Record<string, BuiltInFunction>>;

/** A named function the calculator supports. */
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

/** Whether a name identifies a supported function. */
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

/** A head's bracketed arguments and the parameters it names. */
export type ArgumentList = {
  /** The head as written, such as `mod` or `sum_i`. */
  head: string;
  /** The parameters in order, one per argument. */
  parameters: readonly string[];
  /** Whether every comma at this bracket level separates arguments; defaults to false. */
  variadic?: boolean;
};

/**
 * The argument list a word opens, if it opens one: a function, or a sum's or
 * product's head, well formed or not — `sum` and
 * `sum_2023` divide their brackets like `sum_i`, so that the parser can report
 * the missing index rather than a stray comma. A function of one argument has
 * no separating commas, but can still end with an optional trailing comma.
 * Variadic functions divide at every comma at their own bracket level.
 */
export function readArgumentList(word: string): ArgumentList | undefined {
  if (isCalculatorFunction(word)) {
    const { parameters, variadic }: BuiltInFunction = FUNCTIONS[word];
    return { head: word, parameters, variadic };
  }
  if (iteratedOperatorOf(word) === undefined) return undefined;
  return { head: word, parameters: ITERATION_PARAMETERS };
}

/** How a head's arguments read back, as `mod(dividend, divisor)`. */
export function describeArguments({
  head,
  parameters,
  variadic,
}: ArgumentList): string {
  return `${head}(${[...parameters, ...(variadic ? ['...'] : [])].join(`${ARGUMENT_SEPARATOR} `)})`;
}

const COUNT_WORDS = ['no', 'one', 'two', 'three'];

/** A small count as the messages write it: `two` rather than `2`. */
export function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/** The function that takes a remainder, which `%` does not, since it reads a figure as a percent. */
export const REMAINDER: ArgumentList = {
  head: 'mod',
  parameters: FUNCTIONS.mod.parameters,
};

/** The arithmetic symbols recognized in expressions and editor highlighting. */
export const OPERATOR_SYMBOLS = ['+', '-', '*', '/', '^'] as const;

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
