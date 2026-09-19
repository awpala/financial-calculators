# Text processing and display

The `text` module owns pure text interpretation and value-to-text presentation rules that can be shared across features. Callers supply the values and retain responsibility for searchable fields, interaction state, requests, and persistence. Calendar and timestamp policy lives separately in [datetime/](../datetime/README.md).

## Responsibilities and boundaries

Token-based fuzzy matching and numeric/byte labels are the initial entries. Both return ordinary values without Svelte or application-domain dependencies. Additional text policies should remain explicit about normalization, matching, or display behavior rather than turning this module into a home for unrelated reusable code.

| Text policy      | Responsibility                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| Search matching  | Normalize searchable text into tokens and require every query token to match |
| Value formatting | Fixed-decimal, default-locale numeric, and 1024-based byte labels            |

## Tokenization and search ownership

`tokenizeSearchText(text)` lowercases and splits on anything outside Unicode letters and numbers. Punctuation separates tokens rather than becoming part of a token; repeated separators and empty input yield no empty tokens. Accented letters remain letters, with no accent folding or Unicode normalization pass.

```ts
import {
  fuzzyMatchesAllTokens,
  tokenizeSearchText,
} from '#lib/text/fuzzy-match.js';

const indexed = tokenizeSearchText('Parser reference: 100 examples');
const query = tokenizeSearchText('examples parser');
fuzzyMatchesAllTokens(indexed, query); // true: order is irrelevant
```

Precompute the haystack tokens when the underlying searchable value changes. Tokenize the query when the input changes. The caller chooses searchable fields, combines records, and decides how to handle an empty filter; this module does not know a record shape or authorization boundary.

`fuzzyMatchesAllTokens(haystackTokens, queryTokens)` expects normalized tokens, normally from `tokenizeSearchText`. It returns `false` when either array is empty. In a UI where an empty search should show all records, handle that policy explicitly:

```ts
const visible = query.length === 0 || fuzzyMatchesAllTokens(indexed, query);
```

Every query token must match at least one haystack token. There is no ranking score, phrase-order requirement, or one-to-one token assignment: the same word may satisfy several query tokens, including duplicates. A direct substring match succeeds first, so prefixes and interior fragments work even when the query has no typo budget.

## Edit budget and transpositions

| Query token length | Allowed edits after substring matching |
| ------------------ | -------------------------------------- |
| 1 through 3        | 0                                      |
| 4 through 6        | 1                                      |
| 7 or more          | 2                                      |

Short-token edits match too much vocabulary to be a useful default. Longer tokens tolerate insertions, deletions, substitutions, and adjacent transpositions. The distance is **optimal string alignment**, not unrestricted Damerau–Levenshtein distance. An adjacent swap counts as one edit, preserving a useful match for a common typing slip.

The implementation keeps three rows of the distance matrix and rejects pairs whose length difference already exceeds the budget. Its early exit examines the minima of both recent rows: a transposition edge can skip one row, so stopping merely because the newest row is over budget can discard a later valid path. This detail is retained along with an independent full-matrix test oracle.

Character indexing and lengths in the distance pass follow JavaScript UTF-16 strings. Unicode-aware tokenization does not make edit distance grapheme-aware, normalize composed/decomposed accents, or supply language-specific case/search rules. Add such policy explicitly if the project's text requires it; it changes matching semantics and deserves its own cases.

## Numeric display contracts

`formatFixed(value, fractionDigits)` returns `'0'` for a non-finite value. For finite values it floors precision and clamps it to at least zero, then delegates to native `toFixed`. Precision above 100 still throws `RangeError`; values at least `1e21` in magnitude use the native exponential representation. This is a display primitive, not decimal arithmetic or a rounding policy for money.

`formatInteger(value)` uses `new Intl.NumberFormat()` with the runtime's default locale and options. Despite the name, it does not reject or round all inputs to integers: fractions follow Intl's default precision. Locale-dependent output can differ between server and browser. Use an explicit locale/options policy in the application if output must be identical across runtimes.

`formatBytes(bytes)` expects a caller-validated, finite, non-negative byte count. It uses 1024-based thresholds while preserving the conventional display labels `B`, `KB`, and `MB`:

| Input range                     | Label behavior                           | Example                                                             |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Below 1024                      | Original number plus `B`                 | `1023 B`                                                            |
| 1024 through just below 1048576 | Rounded integer count of 1024-byte units | `1 KB`; a value just below the next threshold can display `1024 KB` |
| 1048576 and above               | One decimal count of 1048576-byte units  | `2.5 MB`                                                            |

There is no GB bucket, locale negotiation, clamping, or input validator. Negative, fractional, and non-finite values are not rejected by the function; validation belongs before presentation. Keeping this narrow policy avoids implying that a three-branch label helper is a general units library.

## Extension and verification

Keep new helpers here cohesive with text matching or labels. File I/O belongs in [dom/](../dom/README.md), time-zone/calendar policy belongs in [datetime/](../datetime/README.md), and record-specific search selection belongs to the route or domain controller. Do not add storage access, hidden caches, or application imports to make a pure helper convenient for its first caller.

The [fuzzy matching tests](../tests/text/fuzzy-match.test.ts) cover normalization, independent token matching, empty queries, substring shortcuts, typo limits, transpositions, and thousands of deterministic word pairs compared with a full-matrix oracle. [Number formatting tests](../tests/text/format-numbers.test.ts) preserve native precision limits and locale behavior; [byte formatting tests](../tests/text/format-bytes.test.ts) cover the unit thresholds and rounding boundary. These tests establish the inherited contracts rather than promising every future search or localization policy. Run the [UI gates](../../../README.md#run-and-validate) after changes.
