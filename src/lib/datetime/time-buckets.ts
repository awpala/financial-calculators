import { formatMonthYear } from '#lib/datetime/format.js';

/** Convert a caller-validated integer month index (0..11) into quarter 1..4. */
export function quarterOfMonthIndex(monthIndex: number): number {
  return Math.floor(monthIndex / 3) + 1;
}

/**
 * Format a native-Date-parseable timestamp as a UTC quarter key (`YYYY-Qn`).
 * The caller validates input; an invalid Date yields 'NaN-QNaN'.
 */
export function quarterKeyUTC(dateISO: string): string {
  const d = new Date(dateISO);
  return `${d.getUTCFullYear()}-Q${quarterOfMonthIndex(d.getUTCMonth())}`;
}

/**
 * Format a native-Date-parseable timestamp as a UTC month key (`YYYY-MM`).
 * The numeric year is not padded; invalid input yields 'NaN-NaN'.
 */
export function monthKeyUTC(dateISO: string): string {
  const d = new Date(dateISO);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Label a caller-produced `YYYY-MM` key with an English month abbreviation.
 * Non-finite fields or months outside 1..12 return the input. This is not a key
 * validator: numeric coercion, fractional fields, and extra segments are allowed.
 */
export function monthLabelFromMonthKey(monthKey: string): string {
  const [yRaw, mRaw] = monthKey.split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return monthKey;
  return formatMonthYear(m - 1, y);
}

/** Strip the year before the first '-Q' delimiter, retaining 'Q'; unmatched keys pass through. */
export function quarterGroupDisplayLabels(periodKeys: string[]): string[] {
  return periodKeys.map((key) => {
    const dash = key.indexOf('-Q');
    return dash === -1 ? key : key.slice(dash + 1);
  });
}

/** Reorder a key's first '-Q' separator into `Qn YYYY`; unmatched keys pass through without validation. */
export function quarterLabelFromQuarterKey(quarterKey: string): string {
  const dash = quarterKey.indexOf('-Q');
  if (dash === -1) return quarterKey;
  return `${quarterKey.slice(dash + 1)} ${quarterKey.slice(0, dash)}`;
}

/**
 * Return indexes preceding a change in the first hyphen-separated field.
 * Callers supply chronologically ordered keys; this neither sorts nor validates.
 */
export function yearSeparatorAfterGroupIndexes(periodKeys: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < periodKeys.length - 1; i++) {
    const curYear = periodKeys[i].split('-')[0];
    const nextYear = periodKeys[i + 1].split('-')[0];
    if (curYear !== nextYear) out.push(i);
  }
  return out;
}

/** Inclusive group-index range and display text for one contiguous year segment. */
export type YearSubAxisLabel = {
  /** First group in the segment, indexed from zero. */
  fromIndex: number;
  /** Last group in the segment, inclusive. */
  toIndex: number;
  /** First hyphen-separated field shared by the segment's keys. */
  label: string;
};

/**
 * Group adjacent keys by their first hyphen-separated field for a year sub-axis.
 * Input order is preserved; disjoint runs of the same year stay separate.
 */
export function yearSubAxisLabels(periodKeys: string[]): YearSubAxisLabel[] {
  const out: YearSubAxisLabel[] = [];
  let i = 0;
  while (i < periodKeys.length) {
    const year = periodKeys[i].split('-')[0];
    let j = i;
    while (
      j + 1 < periodKeys.length &&
      periodKeys[j + 1].split('-')[0] === year
    )
      j++;
    out.push({ fromIndex: i, toIndex: j, label: year });
    i = j + 1;
  }
  return out;
}
