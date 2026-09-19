/**
 * Color primitives shared by the parser and renderer halves of the pipeline.
 *
 * Authored docs carry raw colors in `article[data-color]` attributes and inline
 * `<span style="color: …">` styles. Colors chosen by the author are treated as
 * content, not decoration — they encode meaning the table depends on — so they
 * are validated here and then passed through unchanged.
 */

/** Light- and dark-theme renderings of one authored color. */
export interface ColorPair {
  /** Authored color used against light surfaces. */
  light: string;
  /** Companion color legible against dark surfaces. */
  dark: string;
}

/** Colors accepted from authored content, kept narrow to bar style injection. */
const CSS_COLOR_RE =
  /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]+|rgba?\(\s*[\d.\s,%/]+\)|hsla?\(\s*[\d.\s,%/degrad]+\))$/i;

/** Normalize a hex color into canonical `#rrggbb` form. */
export function normalizeHexColor(color: string | undefined): string | null {
  if (!color) return null;
  const value = color.trim().toLowerCase();
  const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return null;
  if (match[1].length === 6) return value;
  const [r, g, b] = match[1].split('');
  return `#${r}${r}${g}${g}${b}${b}`;
}

/**
 * Accept an authored CSS color, or reject it.
 *
 * The authored value is returned verbatim when it is a plain hex, named,
 * `rgb()`, or `hsl()` color. Anything else — a `url()`, an extra declaration
 * smuggled in past a `;` — yields `null` so the caller renders the content
 * without a color rather than emitting an attacker-chosen style.
 */
export function normalizeCssColor(color: string | undefined): string | null {
  if (!color) return null;
  const value = color.trim();
  return CSS_COLOR_RE.test(value) ? value : null;
}

/** Convert `#rrggbb` to an RGB channel tuple. */
export function hexToRgb(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Convert an RGB channel tuple into canonical `#rrggbb`. */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
