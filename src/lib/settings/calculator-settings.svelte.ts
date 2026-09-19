import { createContext } from 'svelte';
import { persisted } from '#lib/state/storage.svelte.js';
import {
  calculateAmortization,
  DEFAULT_LOAN_INPUTS,
  normalizeLoanInputs,
  type LoanInputs,
} from '#lib/amortization/schedule.js';
import {
  calculateCashflow,
  DEFAULT_CASHFLOW_INPUTS,
  normalizeCashflowInputs,
  type CashflowInputs,
} from '#lib/cashflow/income.js';
import { parseNumberInput } from '#lib/calculator/presentation/number-input.js';

/** Validate a Cashflow preset before saving; working inputs retain their tolerant zero policy. */
export function cashflowDefaultsError(
  inputs: CashflowInputs,
): string | undefined {
  const fields = [
    ['income', 'Income'],
    ['hoursPerWeek', 'Hours per week'],
    ['weeksWorked', 'Weeks worked'],
    ['effectiveTaxRate', 'Effective tax rate'],
    ['retirementContribution', 'Retirement contributions'],
    ['annualDeductions', 'Other deductions'],
  ] as const;
  for (const [key, label] of fields) {
    const value = parseNumberInput(inputs[key]);
    if (!Number.isFinite(value) || value < 0)
      return `${label} must be a nonnegative number.`;
  }
  if (parseNumberInput(inputs.effectiveTaxRate) > 100)
    return 'The effective tax rate must be from 0% to 100%.';
  const result = calculateCashflow(inputs);
  return result.ok ? undefined : result.message;
}

/**
 * Calculator presets and saved working copies owned by one root layout.
 * Routes adopt a working copy on mount and replace it as they edit; Settings
 * changes presets independently and resets only these two working copies.
 * Uses the existing input keys, has no listeners/timers, and needs no teardown.
 * Never construct an instance at module scope or write it during SSR.
 */
export class CalculatorSettings {
  #loanDefaults = persisted<unknown>(
    'amortization_defaults_v1',
    DEFAULT_LOAN_INPUTS,
  );
  #cashflowDefaults = persisted<unknown>(
    'cashflow_defaults_v1',
    DEFAULT_CASHFLOW_INPUTS,
  );
  #loanInputs = persisted<unknown>(
    'amortization_inputs_v1',
    this.amortizationDefaults,
  );
  #cashflowInputs = persisted<unknown>(
    'cashflow_inputs_v1',
    this.cashflowDefaults,
  );

  /** Valid saved loan preset, falling back to the initial illustration if corrupted. */
  get amortizationDefaults(): LoanInputs {
    const inputs = normalizeLoanInputs(this.#loanDefaults.value);
    return calculateAmortization(inputs).ok
      ? inputs
      : { ...DEFAULT_LOAN_INPUTS };
  }

  /** Valid saved take-home preset, falling back to the initial illustration if corrupted. */
  get cashflowDefaults(): CashflowInputs {
    const inputs = normalizeCashflowInputs(this.#cashflowDefaults.value);
    return cashflowDefaultsError(inputs)
      ? { ...DEFAULT_CASHFLOW_INPUTS }
      : inputs;
  }

  /** Save a valid loan preset without changing the working calculator; throws on invalid input. */
  saveAmortizationDefaults(inputs: LoanInputs): void {
    const result = calculateAmortization(inputs);
    if (!result.ok) throw new Error(result.message);
    this.#loanDefaults.value = { ...inputs };
  }

  /** Save a valid take-home preset without changing working inputs; throws on invalid input. */
  saveCashflowDefaults(inputs: CashflowInputs): void {
    const error = cashflowDefaultsError(inputs);
    if (error) throw new Error(error);
    this.#cashflowDefaults.value = { ...inputs };
  }

  /** Current loan working copy, including incomplete edits. Returns a fresh object. */
  get amortizationInputs(): LoanInputs {
    return normalizeLoanInputs(this.#loanInputs.value);
  }
  /** Replace and persist the route's loan working copy, including incomplete edits. */
  set amortizationInputs(inputs: LoanInputs) {
    this.#loanInputs.value = { ...inputs };
  }

  /** Current take-home working copy, including incomplete edits. Returns a fresh object. */
  get cashflowInputs(): CashflowInputs {
    return normalizeCashflowInputs(this.#cashflowInputs.value);
  }
  /** Replace and persist the route's take-home working copy, including incomplete edits. */
  set cashflowInputs(inputs: CashflowInputs) {
    this.#cashflowInputs.value = { ...inputs };
  }

  /** Replace both working copies with saved presets; preserve Scratchpad and all presentation preferences. */
  resetCalculators(): void {
    this.amortizationInputs = this.amortizationDefaults;
    this.cashflowInputs = this.cashflowDefaults;
  }
}

/** Accessors for the root-owned settings controller; no state is shared across application trees. */
export const [getCalculatorSettings, setCalculatorSettings] =
  createContext<CalculatorSettings>();
