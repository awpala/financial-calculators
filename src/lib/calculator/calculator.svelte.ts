import {
  evaluateProgram,
  type Evaluation,
  type EvaluationResult,
} from '#lib/calculator/language/evaluate.js';
import { parseProgram } from '#lib/calculator/parsers/program-parser.js';
import type { ParseResult } from '#lib/calculator/program.js';
import {
  normalizeCalculatorCalculation,
  normalizeCalculatorInput,
  storeCalculation,
} from '#lib/calculator/persistence/calculation.js';
import { normalizeCalculatorFlag } from '#lib/calculator/persistence/preferences.js';
import type { Persisted } from '#lib/state/storage.svelte.js';

/** Collaborators a calculator needs to outlive a page load. */
type CalculatorStoreOptions = {
  /** Browser-local cell holding whether results carry a magnitude suffix. */
  suffixed: Persisted<unknown>;
};

/** Browser-local cells a route-owned calculator reads and writes. */
export type CalculatorCells = {
  /** Browser-local cell holding the saved input text. */
  input: Persisted<unknown>;
  /** Browser-local cell holding the result that input produced. */
  calculation: Persisted<unknown>;
};

/**
 * Own one Scratchpad's source, parse, last calculation, and result presentation.
 * Construct inside the route, never at module scope. Adopt browser storage on
 * mount; source edits invalidate the saved result. This owner acquires no
 * listeners or timers and requires no explicit teardown.
 */
export class CalculatorStore {
  #source = $state('');
  #inputCell: Persisted<unknown> | undefined;
  #calculationCell: Persisted<unknown> | undefined;
  #suffixed = $state(false);
  #suffixedCell: Persisted<unknown>;
  #calculation = $state.raw<Evaluation>();
  #calculationError = $state<string>();

  /** The current input's parse, recomputed as it changes. */
  readonly parsed: ParseResult = $derived(parseProgram(this.source));

  /** Read result presentation without writing to the supplied storage cell. */
  constructor({ suffixed }: CalculatorStoreOptions) {
    this.#suffixedCell = suffixed;
    this.#suffixed = normalizeCalculatorFlag(suffixed.value);
  }

  /** Multi-line input text, bound to the Scratchpad editor. */
  get source(): string {
    return this.#source;
  }

  /**
   * Replace the input text, remembering it in the adopted cell, if any. Any
   * change drops the last result, which described the input as it was.
   */
  set source(next: string) {
    if (next !== this.#source) this.#rememberOutcome(undefined);
    this.#source = next;
    if (this.#inputCell) this.#inputCell.value = next;
  }

  /**
   * Restore saved source and its matching result together without writing.
   * Call on mount with browser-local cells; subsequent edits persist there.
   * A malformed result or one belonging to different source text is discarded.
   */
  adopt({ input, calculation }: CalculatorCells): void {
    this.#inputCell = input;
    this.#calculationCell = calculation;
    this.#source = normalizeCalculatorInput(input.value);
    this.#calculation = normalizeCalculatorCalculation(
      calculation.value,
      this.#source,
    );
    this.#calculationError = undefined;
  }

  /** Whether the current input is a complete, valid program. */
  get canCalculate(): boolean {
    return this.parsed.status === 'valid';
  }

  /** The most recent Calculate, until the input next changes. */
  get calculation(): Evaluation | undefined {
    return this.#calculation;
  }

  /**
   * Why the most recent Calculate stopped short of a result, until the input
   * next changes. Held in memory only, so a reload shows neither this nor a
   * result until Calculate is pressed again.
   */
  get calculationError(): string | undefined {
    return this.#calculationError;
  }

  /** Whether results are shown with a magnitude suffix rather than in full. */
  get suffixed(): boolean {
    return this.#suffixed;
  }

  /** Choose how results read, remembering the choice for this browser. */
  setSuffixed(suffixed: boolean): void {
    this.#suffixed = suffixed;
    this.#suffixedCell.value = suffixed;
  }

  /** Evaluate the current input; a no-op unless it is valid. */
  calculate(): void {
    const parsed = this.parsed;
    if (parsed.status !== 'valid') return;
    this.#rememberOutcome(evaluateProgram(parsed.program));
  }

  /**
   * Hold a Calculate's result or error, or neither, and keep the saved result
   * in step with it.
   */
  #rememberOutcome(outcome: EvaluationResult | undefined): void {
    this.#calculation = outcome?.ok ? outcome.evaluation : undefined;
    this.#calculationError =
      outcome?.ok === false ? outcome.message : undefined;
    if (!this.#calculationCell) return;
    this.#calculationCell.value = storeCalculation(
      this.#source,
      this.#calculation,
    );
  }

  /** Empty the input, and with it the last result. */
  clear(): void {
    this.source = '';
  }
}
