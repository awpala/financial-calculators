/** Browser-local key for the Scratchpad source text. */
export const CALCULATOR_INPUT_STORAGE_KEY = 'scratchpad_input_v1';

/** Browser-local key for the result paired with its source. */
export const CALCULATOR_RESULT_STORAGE_KEY = 'scratchpad_result_v1';

/** Browser-local key for abbreviated result presentation. */
export const CALCULATOR_SUFFIXED_STORAGE_KEY = 'scratchpad_suffixed_v1';

/** Browser-local key for the expanded state of the Scratchpad syntax reference. */
export const CALCULATOR_SYNTAX_EXPANDED_STORAGE_KEY =
  'scratchpad_syntax_expanded_v1';

/** Read a boolean browser preference; only a stored true enables it. */
export function normalizeCalculatorFlag(raw: unknown): boolean {
  return raw === true;
}
