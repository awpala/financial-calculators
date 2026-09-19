// Token-level fuzzy matching for free-text search. Notes are prose, so an
// exact substring rarely survives a reordered phrase or a typo; comparing
// per word with a length-scaled edit budget does.

const EMPTY_TOKENS: readonly string[] = [];

const SEPARATORS = /[^\p{L}\p{N}]+/u;

/**
 * Split text into lowercase Unicode letter/number tokens, dropping punctuation.
 * Blank input yields no tokens; accents are retained without normalization.
 */
export function tokenizeSearchText(text: string): readonly string[] {
  if (text === '') return EMPTY_TOKENS;
  const tokens = text
    .toLowerCase()
    .split(SEPARATORS)
    .filter((token) => token !== '');
  return tokens.length === 0 ? EMPTY_TOKENS : tokens;
}

/**
 * Reports whether every query token matches some haystack token, as a
 * substring or within the token's edit budget. Both inputs should come from
 * tokenizeSearchText; matching is order-independent and a word may satisfy
 * multiple query tokens. An empty query or haystack returns false.
 * Queries shorter than four characters allow no edits, four through six allow
 * one, and longer queries allow two. Adjacent transposition counts as one edit.
 */
export function fuzzyMatchesAllTokens(
  haystack: readonly string[],
  queryTokens: readonly string[],
): boolean {
  if (queryTokens.length === 0 || haystack.length === 0) return false;
  return queryTokens.every((token) =>
    haystack.some((word) => wordMatchesToken(word, token)),
  );
}

// Short tokens get no edit budget: at three characters or fewer, one edit
// reaches too much of the vocabulary to be a useful signal.
function editBudget(length: number): number {
  if (length < 4) return 0;
  if (length < 7) return 1;
  return 2;
}

function wordMatchesToken(word: string, token: string): boolean {
  if (word.includes(token)) return true;
  const budget = editBudget(token.length);
  return budget > 0 && withinEditDistance(word, token, budget);
}

/**
 * Reports whether a and b are within maxEdits operations, counting a swap of
 * two adjacent characters as one (optimal string alignment). Transposition is
 * the most common typing slip, so charging it two edits would exhaust the
 * budget of every word it touches.
 */
function withinEditDistance(a: string, b: string, maxEdits: number): boolean {
  if (Math.abs(a.length - b.length) > maxEdits) return false;
  if (a === b) return true;

  const width = b.length + 1;
  let beforePrevious = new Array<number>(width).fill(0);
  let previous = new Array<number>(width);
  let current = new Array<number>(width);
  for (let j = 0; j < width; j++) previous[j] = j;

  let previousRowMin = 0;
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j < width; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      let best = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrevious[j - 2] + 1);
      }
      current[j] = best;
      if (best < rowMin) rowMin = best;
    }
    // A path into a later row arrives from either of the last two rows -- the
    // transposition edge skips one -- so both must be over budget to bail.
    if (rowMin > maxEdits && previousRowMin > maxEdits) return false;
    previousRowMin = rowMin;
    const recycled = beforePrevious;
    beforePrevious = previous;
    previous = current;
    current = recycled;
  }
  return previous[b.length] <= maxEdits;
}
