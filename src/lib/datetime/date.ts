const DATE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format UTC fields, padding month and day but not year. The caller supplies a
 * valid Date; years 1000..9999 produce the four-digit form parseDateISO accepts.
 * No validity check is performed: an invalid Date produces NaN-NaN-NaN.
 */
export function formatDateISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` string as a UTC date, returning null when the text is
 * malformed or names a day that does not exist (e.g. `2026-02-31`).
 * Surrounding whitespace is allowed. Accepted years are 0100..9999: Date.UTC
 * remaps 00..99 into the twentieth century, so the round-trip guard rejects them.
 */
export function parseDateISO(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!DATE_ISO_PATTERN.test(trimmed)) return null;
  const [year, month, day] = trimmed.split('-').map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

/** Parse with parseDateISO's calendar/year policy, returning epoch milliseconds or null. */
export function parseDateISOMs(raw: string): number | null {
  return parseDateISO(raw)?.getTime() ?? null;
}
