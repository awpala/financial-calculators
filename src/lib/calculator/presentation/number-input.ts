import { DeclaredNames } from '#lib/calculator/parsers/names.js';
import { tokenize } from '#lib/calculator/parsers/tokens.js';

/**
 * Read one finite, optionally signed number using Scratchpad's lexer: dollar
 * signs, comma/underscore digit separators, and case-insensitive k/m/b/t
 * suffixes have exactly the same meaning. Empty or malformed input returns
 * NaN; expressions and declarations belong in Scratchpad. Callers own bounds,
 * percentage units, and their treatment of missing/invalid values.
 */
export function parseNumberInput(source: string): number {
  const lexed = tokenize(source, {
    start: 0,
    end: source.length,
    names: new DeclaredNames(),
    lineAt: () => 1,
  });
  if (!lexed.ok) return Number.NaN;
  const tokens = lexed.tokens;
  let sign = 1;
  let index = 0;
  const first = tokens[0];
  if (
    first?.kind === 'operator' &&
    (first.symbol === '+' || first.symbol === '-')
  ) {
    sign = first.symbol === '-' ? -1 : 1;
    index = 1;
  }
  const number = tokens[index];
  if (tokens.length !== index + 1 || number?.kind !== 'number') {
    return Number.NaN;
  }
  const value = sign * number.value;
  return Number.isFinite(value) ? value : Number.NaN;
}

/**
 * Serialize a converted finite value back into a numeric field without losing
 * precision. Expand JavaScript's scientific notation because Scratchpad's
 * number grammar uses magnitude suffixes instead. Nonfinite values return an
 * empty field; callers should reject such conversions before replacing input.
 */
export function formatNumberInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  const text = String(value);
  const [coefficient = '', exponent] = text.split('e');
  if (exponent === undefined) return text;
  const sign = coefficient.startsWith('-') ? '-' : '';
  const unsigned = coefficient.replace(/^-/, '');
  const [whole = '', fraction = ''] = unsigned.split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) {
    return sign + digits + '0'.repeat(point - digits.length);
  }
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}
