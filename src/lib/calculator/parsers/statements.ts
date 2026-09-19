/**
 * Split calculator input into raw statements before anything is tokenized.
 *
 * A declared name may hold almost any text, spaces and symbols included, so a
 * statement cannot be found by tokenizing first: only `;` ends a statement and
 * only `=` separates a name from its expression. Both are read outside comments,
 * which is what lets a comment say anything at all.
 */

import {
  commentEnd,
  COMMENT_MARKER,
} from '#lib/calculator/language/comments.js';

/** One statement's extent in the input, and where its `=` signs sit. */
export type RawStatement = {
  /** Index of the statement's first character. */
  start: number;
  /** Index just past its last character: its `;`, or the end of the input. */
  end: number;
  /** Whether a `;` ends the statement. */
  terminated: boolean;
  /** Indices of every `=` outside comments, in order. */
  equals: number[];
  /** Index of the first character that is neither whitespace nor comment, if any. */
  contentStart?: number;
};

const WHITESPACE = /\s/;

/**
 * Split input at each `;` outside comments. Text after the last `;` is a final,
 * unterminated statement; it is included even when it holds only whitespace or
 * comments, so the caller decides what an empty one means.
 */
export function splitStatements(source: string): RawStatement[] {
  const statements: RawStatement[] = [];
  let current: RawStatement = {
    start: 0,
    end: 0,
    terminated: false,
    equals: [],
  };
  let index = 0;

  while (index < source.length) {
    const char = source[index] as string;
    if (char === COMMENT_MARKER) {
      index = commentEnd(source, index);
      continue;
    }
    if (char === ';') {
      statements.push({ ...current, end: index, terminated: true });
      current = {
        start: index + 1,
        end: index + 1,
        terminated: false,
        equals: [],
      };
    } else {
      if (current.contentStart === undefined && !WHITESPACE.test(char)) {
        current.contentStart = index;
      }
      if (char === '=') current.equals.push(index);
    }
    index += 1;
  }

  statements.push({ ...current, end: source.length });
  return statements;
}

/** Build a lookup from an index in `source` to its one-based line number. */
export function createLineLocator(source: string): (index: number) => number {
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') lineStarts.push(index + 1);
  }
  return (index) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if ((lineStarts[middle] as number) <= index) low = middle;
      else high = middle - 1;
    }
    return low + 1;
  };
}
