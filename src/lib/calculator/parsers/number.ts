import { magnitudeScale } from '#lib/calculator/language/magnitudes.js';
import { isWordCharacter } from '#lib/calculator/parsers/names.js';

/** Separators permitted only between digits within a number literal. */
export const DIGIT_SEPARATORS = new Set([',', '_']);
const DIGIT = /[0-9]/;

/** Whether a character is an ASCII digit used by number literals. */
export function isDigit(char: string | undefined): boolean {
  return char !== undefined && DIGIT.test(char);
}

/** One number literal or its first lexical error. */
type NumberRead =
  | {
      /** The literal is valid. */
      ok: true;
      /** Numeric value after applying its magnitude suffix. */
      value: number;
      /** Original literal text for diagnostics. */
      text: string;
      /** Index just past the literal, including its suffix. */
      end: number;
    }
  | {
      /** The literal failed validation. */
      ok: false;
      /** The lexical error, without its source line. */
      message: string;
    };

/**
 * Read one number literal starting at `start`, which is a digit or a point
 * before one. The literal ends before `limit`, where a comma separates a sum's
 * or product's arguments rather than grouping digits.
 */
export function readNumber(
  source: string,
  start: number,
  limit = source.length,
): NumberRead {
  let digits = '';
  let seenPoint = false;
  let index = start;

  while (index < limit) {
    const char = source[index] as string;
    if (isDigit(char)) {
      digits += char;
    } else if (DIGIT_SEPARATORS.has(char)) {
      if (!isDigit(source[index - 1]) || !isDigit(source[index + 1])) {
        return { ok: false, message: `'${char}' must sit between digits` };
      }
    } else if (char === '.') {
      if (seenPoint) {
        return {
          ok: false,
          message: 'A number has more than one decimal point',
        };
      }
      if (!isDigit(source[index + 1])) {
        return {
          ok: false,
          message: 'A decimal point must be followed by a digit',
        };
      }
      seenPoint = true;
      digits += char;
    } else {
      break;
    }
    index += 1;
  }

  const suffix = magnitudeScale(source[index]);
  // A suffix that runs into another letter or digit belongs to a word, not to
  // this number, so the mistake is reported rather than read as a magnitude.
  const scale =
    suffix !== undefined && !isWordCharacter(source[index + 1]) ? suffix : 1;
  const end = scale === 1 ? index : index + 1;

  return {
    ok: true,
    value: Number(digits) * scale,
    text: source.slice(start, end),
    end,
  };
}
