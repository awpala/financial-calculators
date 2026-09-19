/**
 * Date and timestamp formatting for displayed values.
 *
 * Dates render as `YYYY-MM-DD` rather than through the viewer's locale, because
 * `M/D/YYYY` and `D/M/YYYY` are indistinguishable for the first twelve days of
 * any month and the reader has no way to tell which one they are looking at.
 * The parts are read in local time, so a timestamp still reads as the moment the
 * viewer experienced it. These are display helpers, not strict date validators.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parse(value: string): Date | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Format a parseable timestamp as year-month-day in local time. Missing or empty
 * input uses the fallback (an em dash by default); invalid nonempty text is
 * returned unchanged. Only month and day are padded, not the numeric year.
 */
export function formatDate(value: string | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const parsed = parse(value);
  return parsed ? isoDate(parsed) : value;
}

/**
 * Format a timestamp as `YYYY-MM-DD HH:mm:ss` in 24-hour local time.
 *
 * Distinct events on the same day retain their time. Missing or empty input uses
 * the fallback (an em dash by default); invalid nonempty text is returned as-is.
 * Parsing follows native Date rules, not the strict UTC calendar-date parser.
 */
export function formatDateTime(
  value: string | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  const parsed = parse(value);
  if (!parsed) return value;
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
  return `${isoDate(parsed)} ${time}`;
}
