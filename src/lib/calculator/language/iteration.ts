/**
 * Sums and products over a whole-number range of an index.
 *
 * `sum_i(i ^ 2, 0, 2)` adds `i ^ 2` for each `i` from 0 through 2, and
 * `prod_j(j + 4, -3, 5)` multiplies `j + 4` for each `j` from -3 through 5. The
 * operator and its index are written as one word joined by `_`, and the index
 * must start with a letter, so that it reads back as a word wherever the body
 * uses it. The three arguments are separated by `,`, which therefore groups
 * digits only inside a nested bracket there.
 *
 * The index belongs to the first argument alone. Within it — nested sums and
 * products included — the index shadows any declared name or outer index spelled
 * the same; in the bounds and past the closing bracket it means nothing, so it
 * never collides with a declared name and is never bound as one.
 *
 * Every word of that shape is reserved, so that `sum_total` reads as a sum over
 * `total` in every input rather than as a figure in some. The bare operator
 * words, and words whose index does not start with a letter, such as `sum` and
 * `sum_2023`, remain ordinary names.
 */

/** The iterated operators, each with the value of an empty range and how a term folds in. */
export const ITERATED_OPERATORS = {
  /** Adds its terms; a sum over an empty range is 0. */
  sum: {
    /** What the operator's result is called. */
    noun: 'sum',
    /** The result over an empty range. */
    empty: 0,
    /** Fold one more term into the running result. */
    combine: (total: number, term: number) => total + term,
  },
  /** Multiplies its terms; a product over an empty range is 1. */
  prod: {
    /** What the operator's result is called. */
    noun: 'product',
    /** The result over an empty range. */
    empty: 1,
    /** Fold one more term into the running result. */
    combine: (total: number, term: number) => total * term,
  },
} as const;

/** A sum or product over a range. */
export type IteratedOperator = keyof typeof ITERATED_OPERATORS;

/** An iterated operator and the index it binds, as a head such as `sum_i` names them. */
export type IterationHead = {
  /** Whether the terms are added or multiplied. */
  operator: IteratedOperator;
  /** The index the first argument reads. */
  index: string;
};

/** The character joining an iterated operator to its index. */
export const INDEX_JOINER = '_';

/** The character separating an iteration's arguments. */
export const ARGUMENT_SEPARATOR = ',';

/** The three arguments a head such as `sum_i` takes, as its messages name them. */
export const ITERATION_PARAMETERS = ['expression', 'start', 'end'] as const;

/**
 * The most terms one calculation evaluates across all its sums and products,
 * nested terms included, so that a mistyped bound is refused rather than
 * stalling the page.
 */
export const TERM_LIMIT = 10_000_000;

const INDEX = /^\p{L}[\p{L}\p{N}_]*$/u;

function isIteratedOperator(word: string): word is IteratedOperator {
  return Object.hasOwn(ITERATED_OPERATORS, word);
}

/**
 * The iterated operator a word calls on, whether or not it names a usable
 * index: `sum_i`, and also `sum` and `sum_1`, which the parser reports.
 */
export function iteratedOperatorOf(word: string): IteratedOperator | undefined {
  const [operator = ''] = word.split(INDEX_JOINER, 1);
  return isIteratedOperator(operator) ? operator : undefined;
}

/** The operator and index a well-formed head names; `sum_i` is the sum over `i`. */
export function readIterationHead(word: string): IterationHead | undefined {
  const joiner = word.indexOf(INDEX_JOINER);
  if (joiner === -1) return undefined;
  const operator = word.slice(0, joiner);
  const index = word.slice(joiner + 1);
  if (!isIteratedOperator(operator) || !INDEX.test(index)) return undefined;
  return { operator, index };
}

/**
 * How many terms a range from `start` through `end` holds: none when `end`
 * comes first, and undefined unless both are whole numbers a double holds
 * exactly, since only those can be counted through one at a time.
 */
export function termCount(start: number, end: number): number | undefined {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return undefined;
  }
  return Math.max(0, end - start + 1);
}
