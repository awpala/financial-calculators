import {
  formatDateISO,
  parseDateISO,
  parseDateISOMs,
} from '#lib/datetime/date.js';
import { describe, expect, it } from 'vitest';

describe('formatDateISO', () => {
  it('formats from UTC fields with zero padding', () => {
    expect(formatDateISO(new Date(Date.UTC(2026, 7, 5)))).toBe('2026-08-05');
    expect(formatDateISO(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12-31');
  });

  it('ignores the local timezone offset', () => {
    expect(formatDateISO(new Date('2026-01-01T23:30:00Z'))).toBe('2026-01-01');
  });

  it('preserves the numeric-year contract without adding year padding', () => {
    expect(formatDateISO(new Date('0100-01-02T00:00:00Z'))).toBe('100-01-02');
    expect(formatDateISO(new Date('invalid'))).toBe('NaN-NaN-NaN');
  });
});

describe('parseDateISO', () => {
  it('parses a well-formed date as UTC midnight', () => {
    const parsed = parseDateISO('2026-08-10');
    expect(parsed?.toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDateISO('  2026-08-10 ')?.getUTCDate()).toBe(10);
  });

  it('rejects malformed text', () => {
    expect(parseDateISO('')).toBeNull();
    expect(parseDateISO('2026-8-10')).toBeNull();
    expect(parseDateISO('10/08/2026')).toBeNull();
  });

  it('rejects days that do not exist', () => {
    expect(parseDateISO('2026-02-31')).toBeNull();
    expect(parseDateISO('2026-13-01')).toBeNull();
  });

  it('rejects Date.UTC remapped years and retains four-digit input bounds', () => {
    expect(parseDateISO('0000-01-01')).toBeNull();
    expect(parseDateISO('0099-01-01')).toBeNull();
    expect(parseDateISO('0100-01-01')?.getUTCFullYear()).toBe(100);
    expect(parseDateISO('0999-01-01')?.getUTCFullYear()).toBe(999);
    expect(parseDateISO('9999-12-31')?.getUTCFullYear()).toBe(9999);
    expect(parseDateISO('10000-01-01')).toBeNull();
  });

  it('round-trips with formatDateISO', () => {
    const iso = '2026-02-29';
    expect(parseDateISO(iso)).toBeNull();
    expect(formatDateISO(parseDateISO('2024-02-29') as Date)).toBe(
      '2024-02-29',
    );
  });
});

describe('parseDateISOMs', () => {
  it('returns epoch milliseconds for valid dates', () => {
    expect(parseDateISOMs('2026-08-10')).toBe(Date.UTC(2026, 7, 10));
  });

  it('returns null for invalid dates', () => {
    expect(parseDateISOMs('nonsense')).toBeNull();
    expect(parseDateISOMs('')).toBeNull();
  });
});
