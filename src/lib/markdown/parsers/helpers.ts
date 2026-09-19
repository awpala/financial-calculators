/** Parse one HTML attribute value from an extracted tag string. */
export function parseHtmlAttr(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  if (!match) return null;
  return (match[2] ?? match[3] ?? match[4] ?? '').trim();
}

/** Parse all `data-*` attributes from a single HTML tag string. */
export function parseHtmlDataAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /\b(data-[a-z0-9_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match = regex.exec(tag);
  while (match) {
    const key = match[1].toLowerCase();
    const value = (match[3] ?? match[4] ?? match[5] ?? '').trim();
    attrs[key] = value;
    match = regex.exec(tag);
  }
  return attrs;
}

/** Parse an HTML `width` attribute into a positive pixel value, when possible. */
export function parseHtmlWidthPx(raw: string | null): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const px = value.match(/^(\d+(?:\.\d+)?)px$/i);
  if (px) {
    const n = Number.parseFloat(px[1]);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  const numeric = value.match(/^\d+(?:\.\d+)?$/);
  if (!numeric) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Count the display width of `text`, where a tab spans four columns. */
export function columnWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += ch === '\t' ? 4 : 1;
  }
  return width;
}

/**
 * Strip `width` columns of indentation from `line`.
 *
 * Indentation is measured in columns because a tab spans four of them, so the
 * count is not interchangeable with a character index. Slicing by the raw count
 * would eat real content on tab-indented lines. A tab straddling `width` is
 * consumed whole, and a line indented less than `width` keeps all its content.
 */
export function sliceIndent(line: string, width: number): string {
  let column = 0;
  for (let i = 0; i < line.length; i++) {
    if (column >= width) return line.slice(i);
    const ch = line[i];
    if (ch === ' ') column++;
    else if (ch === '\t') column += 4;
    else return line.slice(i);
  }
  return '';
}

/** Count leading indentation width (tab characters count as four spaces). */
export function leadingIndent(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === ' ') {
      width++;
      continue;
    }
    if (ch === '\t') {
      width += 4;
      continue;
    }
    break;
  }
  return width;
}

/** True when `line` is a standalone thematic separator (`---` or `===`). */
export function isThematicBreak(line: string): boolean {
  const compact = line.replace(/\s+/g, '');
  if (compact.length < 3) return false;
  return /^-+$/.test(compact) || /^=+$/.test(compact);
}

/**
 * Slugify `text` and disambiguate against ids already issued via `counts`.
 *
 * Duplicate slugs receive a trailing `-2`, `-3`, etc., matching the
 * convention used by most documentation tools.
 */
export function makeId(text: string, counts: Map<string, number>): string {
  const base = slugify(text);
  const n = (counts.get(base) ?? 0) + 1;
  counts.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

/** Convert arbitrary heading text into a URL-safe anchor slug. */
function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}
