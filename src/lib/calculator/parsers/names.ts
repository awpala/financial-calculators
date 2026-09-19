/**
 * What a declared name is, and how a reference to one is recognized.
 *
 * A name is whatever text precedes a declaration's `=` — letters in any script,
 * digits, spaces, and symbols alike — with comments removed, surrounding
 * whitespace trimmed, and inner whitespace runs read as one space. Because a
 * name can contain spaces and operator symbols, a reference cannot be found by
 * splitting an expression into words. Instead, at each point where a value may
 * start, the longest declared name that fits is taken, a space in the name
 * matching any run of whitespace. A name ending in a letter, digit, or
 * underscore must not run straight into another one, so `assets` never matches
 * the front of `assets_new`.
 */

import { splitComments } from '#lib/calculator/language/comments.js';

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;
const NUMERIC_TEXT = /^[\d\s,_.$]+$/u;

/** Reduce the text before a declaration's `=` to the name it declares. */
export function normalizeName(raw: string): string {
  return splitComments(raw)
    .filter((segment) => !segment.comment)
    .map((segment) => segment.text)
    .join('')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Whether a name reads as a figure, such as `100` or `$1,000`. Such a name is
 * refused, since a declared name is matched before a number is and would
 * otherwise silently stand in for that number everywhere it appears.
 */
export function isNumericName(name: string): boolean {
  return NUMERIC_TEXT.test(name);
}

/** Whether a character can continue a word. */
export function isWordCharacter(char: string | undefined): boolean {
  return char !== undefined && WORD_CHARACTER.test(char);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A reference to a declared name found in an expression. */
export type NameMatch = {
  /** The declared name, as normalized. */
  name: string;
  /** Index just past the referring text. */
  end: number;
};

/** The names declared so far, in declaration order, with where each was declared. */
export class DeclaredNames {
  #lines = new Map<string, number>();
  #patterns: { name: string; pattern: RegExp }[] = [];

  /** Record a normalized name as declared on `line`. */
  declare(name: string, line: number): void {
    this.#lines.set(name, line);
    const boundary = isWordCharacter(name.at(-1)) ? '(?![\\p{L}\\p{N}_])' : '';
    const body = name.split(' ').map(escapeRegExp).join('\\s+');
    this.#patterns.push({ name, pattern: new RegExp(body + boundary, 'uy') });
  }

  /** The line a name was declared on, if it has been. */
  lineOf(name: string): number | undefined {
    return this.#lines.get(name);
  }

  /** The longest declared name referred to at `index`, ending no later than `limit`. */
  match(source: string, index: number, limit: number): NameMatch | undefined {
    let best: NameMatch | undefined;
    for (const { name, pattern } of this.#patterns) {
      pattern.lastIndex = index;
      const found = pattern.exec(source);
      if (!found) continue;
      const end = index + found[0].length;
      if (end <= limit && (!best || end > best.end)) best = { name, end };
    }
    return best;
  }
}
