import type { CalculatorValue } from '#lib/calculator/program.js';
import type { Binding, Evaluation } from '#lib/calculator/language/evaluate.js';

/** Read a remembered input out of untrusted storage; anything but text is empty. */
export function normalizeCalculatorInput(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

/** A JSON-safe scalar or flat array, with null representing nonfinite arithmetic. */
type StoredValue = number | null | (number | null)[];

/**
 * A remembered result, kept with the input it was calculated from.
 *
 * The pairing is what makes the entry safe to trust: a result read back beside
 * input it does not describe is discarded rather than shown. A value that is not
 * finite survives the round trip as `null`, since JSON has no infinity or NaN.
 */
type StoredCalculation = {
  /** The input this result was calculated from. */
  source: string;
  /** The result, absent when the input only declared names, `null` when not finite. */
  value?: StoredValue;
  /** Each declared name with its final value. */
  bindings: {
    /** The normalized declared name. */
    name: string;
    /** Its scalar or array value, with null for each nonfinite number. */
    value: StoredValue;
  }[];
};

function storedNumber(value: unknown): number | undefined {
  if (value === null) return Number.NaN;
  return typeof value === 'number' ? value : undefined;
}

function storedValue(value: unknown): CalculatorValue | undefined {
  if (!Array.isArray(value)) return storedNumber(value);
  const numbers: number[] = [];
  for (const element of value) {
    const number = storedNumber(element);
    if (number === undefined) return undefined;
    numbers.push(number);
  }
  return Object.freeze(numbers);
}

function toStoredValue(value: CalculatorValue): StoredValue {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return value.map((element) => (Number.isFinite(element) ? element : null));
}

/** Pair a calculation with its source for JSON storage; clearing a result stores null. */
export function storeCalculation(
  source: string,
  calculation: Evaluation | undefined,
): StoredCalculation | null {
  if (!calculation) return null;
  return {
    source,
    ...(calculation.value === undefined
      ? {}
      : { value: toStoredValue(calculation.value) }),
    bindings: calculation.bindings.map(({ name, value }) => ({
      name,
      value: toStoredValue(value),
    })),
  };
}

/**
 * Read a remembered result out of untrusted storage, keeping it only when it
 * belongs to `source`. Anything malformed is dropped, which costs one
 * press of Calculate and never shows a figure the input does not account for.
 */
export function normalizeCalculatorCalculation(
  raw: unknown,
  source: string,
): Evaluation | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const stored = raw as Partial<StoredCalculation>;
  if (stored.source !== source || !Array.isArray(stored.bindings)) {
    return undefined;
  }
  const bindings: Binding[] = [];
  for (const binding of stored.bindings) {
    const value = storedValue(binding?.value);
    if (typeof binding?.name !== 'string' || value === undefined) {
      return undefined;
    }
    bindings.push({ name: binding.name, value });
  }
  const value = storedValue(stored.value);
  if (stored.value !== undefined && value === undefined) return undefined;
  return { value, bindings };
}
