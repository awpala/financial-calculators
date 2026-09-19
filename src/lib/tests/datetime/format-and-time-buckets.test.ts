import {
  formatMonthDayUTC,
  formatMonthYear,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from '#lib/datetime/format.js';
import {
  monthKeyUTC,
  monthLabelFromMonthKey,
  quarterGroupDisplayLabels,
  quarterKeyUTC,
  quarterLabelFromQuarterKey,
  quarterOfMonthIndex,
  yearSeparatorAfterGroupIndexes,
  yearSubAxisLabels,
} from '#lib/datetime/time-buckets.js';
import { describe, expect, it } from 'vitest';

describe('format utils', () => {
  it('formats month/day and month/year strings', () => {
    expect(formatMonthDayUTC('2026-03-15T00:00:00Z')).toBe('Mar 15');
    expect(formatMonthYear(0, 2026)).toBe('Jan 2026');
    expect(formatMonthYear(99, 2026)).toBe('2026');
    expect(MONTH_LABELS).toHaveLength(12);
  });

  it('shares weekday labels for pickers', () => {
    expect(WEEKDAY_LABELS).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  });

  it('keeps permissive display behavior separate from date validation', () => {
    expect(formatMonthDayUTC('invalid')).toBe('undefined NaN');
    expect(formatMonthYear(1.5, 2026)).toBe('undefined 2026');
    expect(formatMonthYear(Number.NaN, 2026)).toBe('undefined 2026');
  });
});

describe('time bucket utils', () => {
  it('derives quarter and key labels', () => {
    expect(quarterOfMonthIndex(0)).toBe(1);
    expect(quarterOfMonthIndex(11)).toBe(4);
    expect(quarterKeyUTC('2025-11-10T00:00:00Z')).toBe('2025-Q4');
    expect(monthKeyUTC('2025-01-10T00:00:00Z')).toBe('2025-01');
  });

  it('formats month labels and quarter display labels', () => {
    expect(monthLabelFromMonthKey('2025-01')).toBe('Jan 2025');
    expect(monthLabelFromMonthKey('oops')).toBe('oops');
    expect(quarterGroupDisplayLabels(['2025-Q1', '2025-Q2', '2025'])).toEqual([
      'Q1',
      'Q2',
      '2025',
    ]);
  });

  it('turns quarter keys into display labels', () => {
    expect(quarterLabelFromQuarterKey('2025-Q3')).toBe('Q3 2025');
    expect(quarterLabelFromQuarterKey('2025')).toBe('2025');
    expect(quarterLabelFromQuarterKey('')).toBe('');
  });

  it('computes year separators and year sub-axis ranges', () => {
    const keys = ['2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2', '2026-Q1'];
    expect(yearSeparatorAfterGroupIndexes(keys)).toEqual([1, 3]);
    expect(yearSubAxisLabels(keys)).toEqual([
      { fromIndex: 0, toIndex: 1, label: '2024' },
      { fromIndex: 2, toIndex: 3, label: '2025' },
      { fromIndex: 4, toIndex: 4, label: '2026' },
    ]);
  });

  it('preserves key parsing and ordering policy instead of validating or sorting', () => {
    expect(monthKeyUTC('invalid')).toBe('NaN-NaN');
    expect(quarterKeyUTC('invalid')).toBe('NaN-QNaN');
    expect(monthLabelFromMonthKey('2025-01-extra')).toBe('Jan 2025');
    expect(yearSubAxisLabels(['2025-Q1', '2024-Q1', '2025-Q2'])).toEqual([
      { fromIndex: 0, toIndex: 0, label: '2025' },
      { fromIndex: 1, toIndex: 1, label: '2024' },
      { fromIndex: 2, toIndex: 2, label: '2025' },
    ]);
    expect(yearSubAxisLabels([])).toEqual([]);
    expect(yearSeparatorAfterGroupIndexes([])).toEqual([]);
  });
});
