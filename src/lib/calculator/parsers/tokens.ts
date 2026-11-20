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
 * only between two digits of one number, except for argument separators and an
 * optional trailing comma in a call: anywhere else they would silently join or
 * split values.
 *
 * A number may carry a magnitude suffix — `k`, `m`, `b`, or `t`, in either case
 * — which multiplies it by a thousand, a million, a billion, or a trillion, so
 * `$1.5k` is 1,500. The suffix binds to the digits it touches and must end the
 * number, so `1kg` is a mistake to report rather than 1,000 with a stray `g`.
 * A number may then end with `%`, which divides it by a hundred, so `4.5%` is
 * 0.045. The percent binds to the figure just as tightly: a `%` anywhere else
 * is reported, and the remainder is `mod`, a function, so that nothing has to
 * read one `%` two ways. This is a rule about expressions only: a declared name
 * is read before any of this (see `names.ts`) and may spell whatever it likes.
 *
 * Within the brackets of a head that takes several arguments, the last commas
 * at their own level separate them instead (see `arguments.ts`), so `2,0,2` in
 * `sum_i(i ^ 2,0,2)` is three figures while `3,000` in
 * `prod_i(3,000 * i, 0, 1)` is one. A trailing comma before a call's closing
 * bracket is marked separately from digit grouping, including one-argument calls.
 * Variadic min/max calls separate at every comma at their own bracket level.
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
  countWord,
  describeArguments,
  isClosingBracket,
  isOpeningBracket,
  OPERATOR_SYMBOLS,
  readArgumentList,
  REMAINDER,
  type ArgumentList,
  type OperatorSymbol,
  type OpeningBracket,
  type ClosingBracket,
} from '#lib/calculator/language/syntax.js';
import { ARGUMENT_SEPARATOR } from '#lib/calculator/language/iteration.js';
import {
  DIGIT_SEPARATORS,
  isDigit,
  PERCENT_SUFFIX,
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
      /** An argument separator or optional trailing comma in a call, sum, or product. */
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

/** An open argument list, as its head names it, and the commas that divide it. */
type ArgumentGroup = {
  /** The parameters the head names, such as `mod`'s or `sum_i`'s. */
  list: ArgumentList;
  /** Indices of argument separators and the optional trailing comma, in order. */
  separators: readonly number[];
};

/** The argument list a group opened after `previous` holds, if it holds one. */
function opensArguments(previous: Token | undefined): ArgumentList | undefined {
  if (previous?.kind !== 'name' || previous.declared) return undefined;
  return readArgumentList(previous.name);
}

/** The commas that divide a head's arguments, as its message names them. */
function describeSeparators({ head, parameters }: ArgumentList): string {
  const count = parameters.length - 1;
  const comma = `'${ARGUMENT_SEPARATOR}'`;
  return count === 1
    ? `the last ${comma} in '${head}' separates its arguments`
    : `the last ${countWord(count)} ${comma} in '${head}' separate its arguments`;
}

/** Split one expression into tokens, or report the first lexical error. */
export function tokenize(
  source: string,
  { start, end, names, lineAt }: ExpressionRange,
): TokenizeResult {
  const tokens: Token[] = [];
  // One entry per open group, holding its argument separators and optional
  // trailing comma; other commas within a fixed-arity call must group digits.
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
      const list =
        opensArguments(tokens.at(-1)) ??
        (char === '['
          ? { head: 'array', parameters: ['element'], variadic: true }
          : undefined);
      groups.push(
        list && {
          list,
          separators: layOutArguments(
            source,
            index + 1,
            end,
            list.variadic ? 'all' : list.parameters.length - 1,
            skip,
          ).separators,
        },
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
          message:
            group.list.parameters.length === 1
              ? `',' must sit between digits on line ${line}`
              : `Only ${describeSeparators(group.list)}, as '${describeArguments(group.list)}', so the one on line ${line} must sit between digits`,
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
    } else if (char === PERCENT_SUFFIX) {
      return {
        ok: false,
        message: `'${PERCENT_SUFFIX}' reads a figure as a percent and must follow one directly, as '4.5${PERCENT_SUFFIX}'; the one on line ${line} follows none, and the remainder is '${describeArguments(REMAINDER)}'`,
      };
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
