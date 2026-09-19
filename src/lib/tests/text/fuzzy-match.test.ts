import {
  fuzzyMatchesAllTokens,
  tokenizeSearchText,
} from '#lib/text/fuzzy-match.js';
import { describe, expect, it } from 'vitest';

const NOTE =
  'Workflow - 100 entries apiece for review & snippets (Compilation reference guides)';
const SPLIT_NOTE =
  'release notes for CLI & UI (Build); 4 sample documents + 2 sample indexes (Parser & Renderer)';

const matches = (note: string, query: string): boolean =>
  fuzzyMatchesAllTokens(tokenizeSearchText(note), tokenizeSearchText(query));

describe('tokenizeSearchText', () => {
  it('lowercases and strips punctuation', () => {
    expect(tokenizeSearchText('(Compilation reference guides)')).toEqual([
      'compilation',
      'reference',
      'guides',
    ]);
  });

  it('keeps numerics as their own tokens', () => {
    expect(tokenizeSearchText('Entry - 100 apiece')).toEqual([
      'entry',
      '100',
      'apiece',
    ]);
  });

  it('returns empty for blank and punctuation-only input', () => {
    expect(tokenizeSearchText('')).toEqual([]);
    expect(tokenizeSearchText('  --- ')).toEqual([]);
  });

  it('preserves accented letters rather than splitting on them', () => {
    expect(tokenizeSearchText('Café Münster')).toEqual(['café', 'münster']);
  });
});

describe('fuzzyMatchesAllTokens', () => {
  it('matches tokens out of order', () => {
    expect(matches(NOTE, 'compilation snippets')).toBe(true);
    expect(matches(SPLIT_NOTE, 'indexes documents')).toBe(true);
  });

  it('requires every query token to match', () => {
    expect(matches(NOTE, 'compilation unrelated')).toBe(false);
  });

  it('tolerates a typo in a medium-length token', () => {
    expect(matches(NOTE, 'compilaton')).toBe(true);
    expect(matches(NOTE, 'apeice')).toBe(true);
  });

  it('matches word prefixes as substrings', () => {
    expect(matches(NOTE, 'guid')).toBe(true);
    expect(matches(SPLIT_NOTE, 'render')).toBe(true);
  });

  it('does not spend an edit budget on short tokens', () => {
    // "cli" is 3 characters, so "clo" must not match it.
    expect(matches(SPLIT_NOTE, 'cli')).toBe(true);
    expect(matches(SPLIT_NOTE, 'clo')).toBe(false);
  });

  it('rejects a typo beyond the token budget', () => {
    expect(matches(NOTE, 'kompilation')).toBe(true);
    expect(matches(NOTE, 'kompilatix')).toBe(false);
  });

  it('is false when either side has no tokens', () => {
    expect(matches('', 'guid')).toBe(false);
    expect(matches(NOTE, '')).toBe(false);
    expect(matches(NOTE, '---')).toBe(false);
  });
});

// The matcher's distance pass rotates three rows and bails early, so it is
// checked against a plain full-matrix implementation of the same metric.
describe('fuzzyMatchesAllTokens edit distance', () => {
  const referenceDistance = (a: string, b: string): number => {
    const d = Array.from({ length: a.length + 1 }, () =>
      new Array<number>(b.length + 1).fill(0),
    );
    for (let i = 0; i <= a.length; i++) d[i][0] = i;
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  };

  const referenceBudget = (length: number): number => {
    if (length < 4) return 0;
    if (length < 7) return 1;
    return 2;
  };

  it('agrees with a full-matrix reference across random word pairs', () => {
    let seed = 0x2f6e2b1;
    const random = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const word = (): string => {
      const length = 1 + Math.floor(random() * 9);
      let out = '';
      for (let i = 0; i < length; i++) {
        out += 'abcde'[Math.floor(random() * 5)];
      }
      return out;
    };

    let compared = 0;
    for (let trial = 0; trial < 4000; trial++) {
      const haystackWord = word();
      const token = word();
      // Substring hits short-circuit before the distance pass runs.
      if (haystackWord.includes(token)) continue;
      compared++;
      expect(fuzzyMatchesAllTokens([haystackWord], [token])).toBe(
        referenceDistance(haystackWord, token) <= referenceBudget(token.length),
      );
    }
    expect(compared).toBeGreaterThan(3000);
  });
});
