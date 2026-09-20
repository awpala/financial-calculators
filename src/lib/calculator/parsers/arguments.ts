/**
 * Where a bracketed argument list divides.
 *
 * A list takes one comma fewer than it has arguments, and the last commas
 * directly within its brackets are the ones that separate them: the last two
 * of a sum's or product's three arguments, the last one of `mod`'s two. Any
 * comma before them belongs to an argument, where it groups digits as it does
 * anywhere else, so `prod_i(3,000 * i, 0, 1)` multiplies `3,000 * i`. Reading
 * from the right is safe because what follows the separators is written
 * without grouping — the bounds are whole numbers — and a bound written as
 * `1,000` would be divided at its comma. Commas inside a nested bracket, a
 * comment, or a declared name are not directly within the brackets and never
 * divide them.
 */

import { ARGUMENT_SEPARATOR } from '#lib/calculator/language/iteration.js';
import {
  isClosingBracket,
  isOpeningBracket,
} from '#lib/calculator/language/syntax.js';

/** How one argument list divides, and where it ends. */
export type ArgumentLayout = {
  /** Indices of the commas separating arguments, in order: the last `count` directly within the brackets, or fewer if there are fewer. */
  separators: number[];
  /** Index of the bracket closing the list, or of wherever reading stopped short of one. */
  end: number;
};

/**
 * Lay out the argument list whose text begins at `start`, just past its opening
 * bracket, reading no further than `end` or the `;` that ends its statement.
 * The list takes `count` separators, one fewer than the arguments its head
 * names. Wherever a comment or a declared name begins, `skip` returns the index
 * just past it, so that nothing within one is read as a bracket or a comma.
 */
export function layOutArguments(
  source: string,
  start: number,
  end: number,
  count: number,
  skip: (index: number) => number | undefined,
): ArgumentLayout {
  const commas: number[] = [];
  let depth = 0;
  let index = start;

  while (index < end) {
    const skipped = skip(index);
    if (skipped !== undefined) {
      index = skipped;
      continue;
    }
    const char = source[index];
    if (char === ';' || (isClosingBracket(char) && depth === 0)) break;
    if (isOpeningBracket(char)) {
      depth += 1;
    } else if (isClosingBracket(char)) {
      depth -= 1;
    } else if (char === ARGUMENT_SEPARATOR && depth === 0) {
      commas.push(index);
    }
    index += 1;
  }

  return { separators: commas.slice(-count), end: Math.min(index, end) };
}
