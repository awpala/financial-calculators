/** Month abbreviations used across chart axes and labels. */
export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** English weekday abbreviations ordered Sunday through Saturday; treat as immutable. */
export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format a native-Date-parseable timestamp as English `Mon D` using UTC fields.
 * The caller supplies valid input; invalid dates yield 'undefined NaN'.
 */
export function formatMonthDayUTC(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Format an integer zero-based month and numeric year as English `Mon YYYY`.
 * Months outside 0..11 fall back to the year; fractional/NaN months are not
 * validated and produce an undefined month label. The year is not padded.
 */
export function formatMonthYear(monthIndex: number, year: number): string {
  if (monthIndex < 0 || monthIndex > 11) return `${year}`;
  return `${MONTH_LABELS[monthIndex]} ${year}`;
}
