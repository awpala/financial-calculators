/** Browser-local key for the Scratchpad source text. */
export const CALCULATOR_INPUT_STORAGE_KEY = 'scratchpad_input_v1';

/** Browser-local key for the result paired with its source. */
export const CALCULATOR_RESULT_STORAGE_KEY = 'scratchpad_result_v1';

/** Browser-local key for abbreviated result presentation. */
export const CALCULATOR_SUFFIXED_STORAGE_KEY = 'scratchpad_suffixed_v1';

/** Browser-local key for the expanded state of the Scratchpad syntax reference. */
export const CALCULATOR_SYNTAX_EXPANDED_STORAGE_KEY =
  'scratchpad_syntax_expanded_v1';

/** Browser-local key for the named-bindings table's column and sort direction. */
export const CALCULATOR_BINDINGS_SORT_STORAGE_KEY =
  'scratchpad_bindings_sort_v1';

/** Presentation preference owned and persisted by the Scratchpad route. */
export type CalculatorBindingsSort = {
  /** Binding attribute used to order table rows. */
  column: 'line' | 'name' | 'value';
  /** Whether the selected column increases or decreases down the table. */
  direction: 'ascending' | 'descending';
};

/** Read a saved table sort; missing or malformed preferences default to Line ascending. */
export function normalizeCalculatorBindingsSort(
  raw: unknown,
): CalculatorBindingsSort {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'column' in raw &&
    'direction' in raw &&
    (raw.column === 'line' ||
      raw.column === 'name' ||
      raw.column === 'value') &&
    (raw.direction === 'ascending' || raw.direction === 'descending')
  ) {
    return { column: raw.column, direction: raw.direction };
  }
  return { column: 'line', direction: 'ascending' };
}

/** Read a boolean browser preference; only a stored true enables it. */
export function normalizeCalculatorFlag(raw: unknown): boolean {
  return raw === true;
}
