import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '#lib/datetime/datetime.js';

// Built from local parts so the expectation holds under any TZ the suite runs
// in; what is asserted is the shape and the ordering, not a fixed offset.
function localIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

describe('date formatting', () => {
  it('renders a date as YYYY-MM-DD', () => {
    const date = new Date(2026, 6, 4, 5, 6, 7);
    expect(formatDate(date.toISOString())).toBe(localIso(date));
  });

  // The zero padding is the point: an unpadded 2026-7-4 sorts and scans wrong,
  // and is the failure mode a locale format already has.
  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);
    expect(formatDate(date.toISOString())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDate(date.toISOString())).toBe(localIso(date));
  });

  it('keeps a 24-hour time alongside the date', () => {
    const date = new Date(2026, 6, 4, 14, 57, 59);
    expect(formatDateTime(date.toISOString())).toBe(
      `${localIso(date)} 14:57:59`,
    );
  });

  it('falls back rather than rendering an invalid date', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDate('', 'never')).toBe('never');
    // An unparseable value is shown as sent: it is more useful than a placeholder.
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
