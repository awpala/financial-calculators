/**
 * Split calculator input into the runs the editor colors: comments, declared
 * names, operators, and the plain figures between them.
 *
 * This reads the input the same way the parser does, but it never refuses one.
 * A member is mid-edit most of the time, and highlighting that disappeared
 * whenever the input did not yet parse would flicker on nearly every keystroke,
 * so each statement is judged on its own: a declaration whose name is well
 * formed and not already taken colors that name, and references to it colored
 * from there on. A sum's or product's index is colored as a name where its head
 * binds it and within its first argument, the only place it means anything,
 * and the commas separating its arguments are colored with its operator.
 * Anything it cannot make sense of is simply left plain.
 */

import {
  commentEnd,
  COMMENT_MARKER,
  splitComments,
} from '#lib/calculator/language/comments.js';
import {
  DeclaredNames,
  isWordCharacter,
} from '#lib/calculator/parsers/names.js';
import {
  FUNCTIONS,
  isCalculatorConstant,
  isOpeningBracket,
  isReservedName,
  OPERATOR_SYMBOLS,
} from '#lib/calculator/language/syntax.js';
import { readIterationHead } from '#lib/calculator/language/iteration.js';
import { layOutArguments } from '#lib/calculator/parsers/arguments.js';
import { readDeclaration } from '#lib/calculator/parsers/declaration.js';
import {
  createLineLocator,
  splitStatements,
} from '#lib/calculator/parsers/statements.js';

/** What a run of input says, for the editor to color it by. */
export type SourceTone = 'comment' | 'constant' | 'variable' | 'operator';

/** One run of input, toned when it is a comment, a declared name, or an operator. */
export type HighlightedSegment = {
  /** The run's text, exactly as it appears in the input. */
  text: string;
  /** What the run is, when it is not ordinary arithmetic. */
  tone?: SourceTone;
};

type Span = { start: number; end: number; tone: SourceTone };

/** Split input into runs that concatenate back to it, toned where they apply. */
export function highlightInput(source: string): HighlightedSegment[] {
  const named = [...commentSpans(source), ...variableSpans(source)];
  const constants = constantSpans(source, named);
  const claimed = [
    ...named,
    ...constants,
    ...iterationSpans(source, [...named, ...constants]),
  ].sort((left, right) => left.start - right.start);
  const spans = [...claimed, ...operatorSpans(source, claimed)].sort(
    (left, right) => left.start - right.start,
  );

  const segments: HighlightedSegment[] = [];
  let index = 0;
  for (const span of spans) {
    if (span.start < index) continue;
    if (span.start > index) {
      segments.push({ text: source.slice(index, span.start) });
    }
    segments.push({
      text: source.slice(span.start, span.end),
      tone: span.tone,
    });
    index = span.end;
  }
  if (index < source.length) segments.push({ text: source.slice(index) });
  return segments;
}

/** Built-in constants that are not already part of a comment or declared name. */
function constantSpans(source: string, claimed: readonly Span[]): Span[] {
  const claimedUntil = new Array<number | undefined>(source.length);
  for (const { start, end } of claimed) claimedUntil.fill(end, start, end);

  const spans: Span[] = [];
  for (const word of source.matchAll(WORD)) {
    const start = word.index;
    if (claimedUntil[start] !== undefined || !isCalculatorConstant(word[0])) {
      continue;
    }
    spans.push({ start, end: start + word[0].length, tone: 'constant' });
  }
  return spans;
}

function commentSpans(source: string): Span[] {
  const spans: Span[] = [];
  let index = 0;
  for (const segment of splitComments(source)) {
    if (segment.comment) {
      spans.push({
        start: index,
        end: index + segment.text.length,
        tone: 'comment',
      });
    }
    index += segment.text.length;
  }
  return spans;
}

/** The declarations that stand up on their own, and every later reference. */
function variableSpans(source: string): Span[] {
  const spans: Span[] = [];
  const names = new DeclaredNames();
  const lineAt = createLineLocator(source);

  for (const statement of splitStatements(source)) {
    if (statement.contentStart === undefined) continue;
    const [equalsAt] = statement.equals;
    spans.push(
      ...referenceSpans(
        source,
        names,
        statement.contentStart,
        equalsAt ?? statement.end,
      ),
    );
    if (equalsAt === undefined) continue;

    const declaration = readDeclaration(source, statement, names, lineAt);
    if (!declaration.ok) continue;
    const { name, line } = declaration;

    spans.push({
      start: statement.contentStart,
      end: trimmedEnd(source, statement.contentStart, equalsAt),
      tone: 'variable',
    });
    names.declare(name, line);
    spans.push(...referenceSpans(source, names, equalsAt + 1, statement.end));
  }

  return spans;
}

function referenceSpans(
  source: string,
  names: DeclaredNames,
  start: number,
  end: number,
): Span[] {
  const spans: Span[] = [];
  let index = start;

  while (index < end) {
    // A name never spans a comment, and a match that began inside a longer word
    // would color part of it, so neither position is offered one.
    if (source[index] === COMMENT_MARKER) {
      index = commentEnd(source, index, end);
      continue;
    }
    const match =
      isWordCharacter(source[index - 1]) && isWordCharacter(source[index])
        ? undefined
        : names.match(source, index, end);
    if (match) {
      spans.push({ start: index, end: match.end, tone: 'variable' });
      index = match.end;
    } else {
      index += 1;
    }
  }

  return spans;
}

const WORD = /[\p{L}\p{N}_]+/gu;

/**
 * Each sum's and product's operator and argument-separating commas, toned as
 * operators, and its index, toned as a name where the head binds it and wherever
 * its first argument reads it. The bounds and everything past the closing
 * bracket leave the index plain, since it means nothing there, and a comma that
 * groups digits stays plain like the figure it belongs to. Comments and declared
 * names keep what they claimed.
 */
function iterationSpans(source: string, claimed: readonly Span[]): Span[] {
  const claimedUntil = new Array<number | undefined>(source.length);
  for (const { start, end } of claimed) claimedUntil.fill(end, start, end);
  const skip = (index: number) => claimedUntil[index];

  const spans: Span[] = [];
  for (const word of source.matchAll(WORD)) {
    const head = readIterationHead(word[0]);
    if (!head || isReservedName(head.index) || skip(word.index)) continue;

    const end = word.index + word[0].length;
    const indexAt = end - head.index.length;
    spans.push(
      { start: word.index, end: indexAt, tone: 'operator' },
      { start: indexAt, end, tone: 'variable' },
    );

    const open = openingBracketAfter(source, end, skip);
    if (open === undefined) continue;
    const list = layOutArguments(source, open + 1, source.length, skip);
    for (const separator of list.separators) {
      spans.push({ start: separator, end: separator + 1, tone: 'operator' });
    }
    const bodyEnd = list.separators[0] ?? list.end;
    for (const reference of source.slice(open + 1, bodyEnd).matchAll(WORD)) {
      const start = open + 1 + reference.index;
      if (reference[0] === head.index && !skip(start)) {
        spans.push({ start, end: start + head.index.length, tone: 'variable' });
      }
    }
  }

  return spans;
}

/** The opening bracket after `from`, past whitespace, `$`, and comments, if one comes next. */
function openingBracketAfter(
  source: string,
  from: number,
  skip: (index: number) => number | undefined,
): number | undefined {
  let index = from;
  while (index < source.length) {
    const skipped = skip(index);
    if (skipped !== undefined && source[index] === COMMENT_MARKER) {
      index = skipped;
    } else if (/[\s$]/.test(source[index] as string)) {
      index += 1;
    } else {
      break;
    }
  }
  return isOpeningBracket(source[index]) ? index : undefined;
}

/** The end of the text between `start` and `limit`, ignoring trailing whitespace. */
function trimmedEnd(source: string, start: number, limit: number): number {
  let end = limit;
  while (end > start && /\s/.test(source[end - 1] as string)) end -= 1;
  return end;
}

// `=` is not arithmetic, but it is what separates a declaration's two halves,
// and reading as an operator is what makes that separation visible.
const HIGHLIGHT_OPERATORS = new Set<string>([...OPERATOR_SYMBOLS, '=']);
const OPERATOR_WORDS = Object.keys(FUNCTIONS).sort(
  (left, right) => right.length - left.length,
);

/**
 * The operators in whatever the comments and names did not claim, so a `log` of
 * a member's own naming stays their name and a `#` keeps its whole line.
 */
function operatorSpans(source: string, claimed: readonly Span[]): Span[] {
  const spans: Span[] = [];
  const bounds = [...claimed, { start: source.length, end: source.length }];
  let index = 0;

  for (const claim of bounds) {
    while (index < claim.start) {
      const word = OPERATOR_WORDS.find(
        (candidate) =>
          source.startsWith(candidate, index) &&
          index + candidate.length <= claim.start &&
          !isWordCharacter(source[index - 1]) &&
          !isWordCharacter(source[index + candidate.length]),
      );
      if (HIGHLIGHT_OPERATORS.has(source[index] as string)) {
        spans.push({ start: index, end: index + 1, tone: 'operator' });
        index += 1;
      } else if (word) {
        spans.push({
          start: index,
          end: index + word.length,
          tone: 'operator',
        });
        index += word.length;
      } else {
        index += 1;
      }
    }
    index = Math.max(index, claim.end);
  }

  return spans;
}
