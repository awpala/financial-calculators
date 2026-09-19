/**
 * Lexical rules for one expression within calculator input: what counts as a
 * number, an operator, a bracket, or a name, and what is skipped entirely.
 *
 * Skipped text is whitespace (newlines included), dollar signs, and comments,
 * which run from `#` to the end of their line so a row can label the figures
 * beneath it. Wherever a value may start, a reference to a declared name is
 * tried first (see `names.ts`); failing that, a word — a letter followed by
 * letters, digits, and underscores — is read as a name for the parser to
 * resolve. Outside a name, commas and underscores group digits and are accepted
 * only between two digits of one number: anywhere else they would silently join
 * or split values.
 *
 * A number may carry a magnitude suffix — `k`, `m`, `b`, or `t`, in either case
 * — which multiplies it by a thousand, a million, a billion, or a trillion, so
 * `$1.5k` is 1,500. The suffix binds to the digits it touches and must end the
 * number, so `1kg` is a mistake to report rather than 1,000 with a stray `g`.
 * This is a rule about expressions only: a declared name is read before any of
 * this (see `names.ts`) and may spell whatever it likes.
 *
 * Within the brackets of a sum or product, the last two commas at their own
 * level separate its arguments instead (see `arguments.ts`), so `2,0,2` in
 * `sum_i(i ^ 2,0,2)` is three figures while `3,000` in
 * `prod_i(3,000 * i, 0, 1)` is one.
 */

import {
  commentEnd,
  COMMENT_MARKER,
} from '#lib/calculator/language/comments.js';
import {
  isWordCharacter,
  type DeclaredNames,
} from '#lib/calculator/parsers/names.js';
import { layOutArguments } from '#lib/calculator/parsers/arguments.js';
import {
  isClosingBracket,
  isOpeningBracket,
  OPERATOR_SYMBOLS,
  type OperatorSymbol,
  type OpeningBracket,
  type ClosingBracket,
} from '#lib/calculator/language/syntax.js';
import {
  ARGUMENT_SEPARATOR,
  iteratedOperatorOf,
} from '#lib/calculator/language/iteration.js';
import {
  DIGIT_SEPARATORS,
  isDigit,
  readNumber,
} from '#lib/calculator/parsers/number.js';

/** One lexical unit of calculator input, with the line it starts on. */
export type Token = {
  /** One-based source line where the token starts. */
  line: number;
} & (
  | {
      /** A number literal. */
      kind: 'number';
      /** Numeric value after applying any magnitude suffix. */
      value: number;
      /** Original literal text for diagnostics. */
      text: string;
    }
  | {
      /** An arithmetic operator. */
      kind: 'operator';
      /** The operation written in the input. */
      symbol: OperatorSymbol;
    }
  | {
      /** The start of a grouped expression. */
      kind: 'open';
      /** The opening bracket as written. */
      bracket: OpeningBracket;
    }
  | {
      /** The end of a grouped expression. */
      kind: 'close';
      /** The closing bracket as written. */
      bracket: ClosingBracket;
    }
  | {
      /** A declared reference or a word the parser must resolve. */
      kind: 'name';
      /** Normalized declaration name or unresolved word. */
      name: string;
      /** Whether the name matched an earlier declaration. */
      declared: boolean;
    }
  | {
      /** The comma between two arguments of a sum or product. */
      kind: 'separator';
    }
);

/** The outcome of tokenizing calculator input. */
export type TokenizeResult =
  | {
      /** The complete expression was tokenized. */
      ok: true;
      /** Tokens in source order. */
      tokens: Token[];
    }
  | {
      /** A lexical error prevented tokenization. */
      ok: false;
      /** The first lexical error with its source line. */
      message: string;
    };

const OPERATORS = new Set<string>(OPERATOR_SYMBOLS);
const LETTER = /\p{L}/u;

/** The part of the input one expression occupies, and what it may refer to. */
export type ExpressionRange = {
  /** Index of the expression's first character. */
  start: number;
  /** Index just past its last character. */
  end: number;
  /** Names declared by earlier statements. */
  names: DeclaredNames;
  /** Maps an index in the input to its one-based line. */
  lineAt: (index: number) => number;
};

type NameToken = Extract<Token, { kind: 'name' }>;

/** A sum's or product's open argument list, as written, and the commas that divide it. */
type ArgumentGroup = {
  /** The head that opened it, such as `sum_i`. */
  head: string;
  /** Indices of the commas separating its arguments, in order. */
  separators: readonly number[];
};

/** Whether a group opened after `previous` holds a sum's or product's arguments. */
function opensArguments(previous: Token | undefined): previous is NameToken {
  return (
    previous?.kind === 'name' &&
    !previous.declared &&
    iteratedOperatorOf(previous.name) !== undefined
  );
}

/** Split one expression into tokens, or report the first lexical error. */
export function tokenize(
  source: string,
  { start, end, names, lineAt }: ExpressionRange,
): TokenizeResult {
  const tokens: Token[] = [];
  // One entry per open group, holding its argument layout when it is a sum's
  // or product's; a comma that divides none of them groups digits.
  const groups: (ArgumentGroup | undefined)[] = [];
  const skip = (at: number): number | undefined => {
    if (source[at] === COMMENT_MARKER) return commentEnd(source, at, end);
    if (isWordCharacter(source[at - 1]) && isWordCharacter(source[at])) {
      return undefined;
    }
    return names.match(source, at, end)?.end;
  };
  let index = start;

  while (index < end) {
    const char = source[index] as string;
    const line = lineAt(index);
    const group = groups.at(-1);

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === COMMENT_MARKER) {
      index = commentEnd(source, index, end);
      continue;
    }

    const declared = names.match(source, index, end);
    if (declared) {
      tokens.push({ kind: 'name', name: declared.name, declared: true, line });
      index = declared.end;
    } else if (char === '$') {
      index += 1;
    } else if (isDigit(char) || (char === '.' && isDigit(source[index + 1]))) {
      const number = readNumber(
        source,
        index,
        group?.separators.find((separator) => separator > index),
      );
      if (!number.ok) {
        return { ok: false, message: `${number.message} on line ${line}` };
      }
      tokens.push({
        kind: 'number',
        value: number.value,
        text: number.text,
        line,
      });
      index = number.end;
    } else if (OPERATORS.has(char)) {
      tokens.push({ kind: 'operator', symbol: char as OperatorSymbol, line });
      index += 1;
    } else if (isOpeningBracket(char)) {
      const previous = tokens.at(-1);
      groups.push(
        opensArguments(previous)
          ? {
              head: previous.name,
              separators: layOutArguments(source, index + 1, end, skip)
                .separators,
            }
          : undefined,
      );
      tokens.push({ kind: 'open', bracket: char, line });
      index += 1;
    } else if (isClosingBracket(char)) {
      groups.pop();
      tokens.push({ kind: 'close', bracket: char, line });
      index += 1;
    } else if (char === ARGUMENT_SEPARATOR && group) {
      if (!group.separators.includes(index)) {
        return {
          ok: false,
          message: `Only the last two '${ARGUMENT_SEPARATOR}' in '${group.head}' separate its arguments, as '${group.head}(expression, start, end)', so the one on line ${line} must sit between digits`,
        };
      }
      tokens.push({ kind: 'separator', line });
      index += 1;
    } else if (LETTER.test(char)) {
      let wordEnd = index + 1;
      while (wordEnd < end && isWordCharacter(source[wordEnd])) wordEnd += 1;
      const name = source.slice(index, wordEnd);
      tokens.push({ kind: 'name', name, declared: false, line });
      index = wordEnd;
    } else if (DIGIT_SEPARATORS.has(char)) {
      return {
        ok: false,
        message:
          char === '_'
            ? `'_' must sit between digits or within a name on line ${line}`
            : `',' must sit between digits on line ${line}`,
      };
    } else if (char === '.') {
      return {
        ok: false,
        message: `A decimal point must be followed by a digit on line ${line}`,
      };
    } else {
      return { ok: false, message: `Unexpected '${char}' on line ${line}` };
    }
  }

  return { ok: true, tokens };
}
