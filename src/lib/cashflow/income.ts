import {
  formatNumberInput,
  numberFieldIssues,
  parseNumberInput,
  parsePercentInput,
  type NumberFieldIssue,
} from '#lib/calculator/presentation/number-input.js';

/** Editable take-home-pay assumptions, kept as text while the user works. */
export type CashflowInputs = {
  /** Whether income is an hourly rate rather than an annual salary. */
  useHourlyIncome: boolean;
  /** Gross salary or hourly rate in USD, according to useHourlyIncome. */
  income: string;
  /** Paid hours in a working week, used only for hourly income. */
  hoursPerWeek: string;
  /** Paid working weeks per year, used only for hourly income. */
  weeksWorked: string;
  /** Effective tax rate applied to gross income, in percent. */
  effectiveTaxRate: string;
  /** Annual retirement contributions deducted after estimated taxes. */
  retirementContribution: string;
  /** Other annual deductions taken from after-tax income. */
  annualDeductions: string;
};

/** Default assumptions for the Cashflow calculator before a custom preset is saved. */
export const DEFAULT_CASHFLOW_INPUTS: Readonly<CashflowInputs> = {
  useHourlyIncome: false,
  income: '120,000',
  hoursPerWeek: '40',
  weeksWorked: '52',
  effectiveTaxRate: '24',
  retirementContribution: '12,000',
  annualDeductions: '0',
};

/** Unrounded USD values in the annual balance sheet and monthly summary. */
export type Cashflow = {
  /** Gross annual salary, annualized from work hours when appropriate. */
  annualGrossIncome: number;
  /** Estimated annual taxes using the supplied effective rate. */
  annualTaxes: number;
  /** Annual retirement contributions entered by the user. */
  annualRetirementContribution: number;
  /** Other annual deductions entered by the user. */
  annualDeductions: number;
  /** Remaining annual income, with a floor of zero. */
  annualNetIncome: number;
  /** Annual net income divided evenly over twelve months. */
  monthlyNetIncome: number;
};

/** Calculated take-home pay or an explanation when annualization overflows. */
export type CashflowResult =
  | {
      /** Successful finite calculation. */
      ok: true;
      /** Computed income and deductions. */
      cashflow: Cashflow;
    }
  | {
      /** Inputs cannot produce a finite annual gross income. */
      ok: false;
      /** User-facing explanation; no partial figures should be displayed. */
      message: string;
    };

/** Restore known fields from browser storage without mutating the saved payload. */
export function normalizeCashflowInputs(raw: unknown): CashflowInputs {
  const input =
    raw && typeof raw === 'object' ? (raw as Partial<CashflowInputs>) : {};
  return {
    useHourlyIncome: input.useHourlyIncome === true,
    income:
      typeof input.income === 'string'
        ? input.income
        : DEFAULT_CASHFLOW_INPUTS.income,
    hoursPerWeek:
      typeof input.hoursPerWeek === 'string'
        ? input.hoursPerWeek
        : DEFAULT_CASHFLOW_INPUTS.hoursPerWeek,
    weeksWorked:
      typeof input.weeksWorked === 'string'
        ? input.weeksWorked
        : DEFAULT_CASHFLOW_INPUTS.weeksWorked,
    effectiveTaxRate:
      typeof input.effectiveTaxRate === 'string'
        ? input.effectiveTaxRate
        : DEFAULT_CASHFLOW_INPUTS.effectiveTaxRate,
    retirementContribution:
      typeof input.retirementContribution === 'string'
        ? input.retirementContribution
        : DEFAULT_CASHFLOW_INPUTS.retirementContribution,
    annualDeductions:
      typeof input.annualDeductions === 'string'
        ? input.annualDeductions
        : DEFAULT_CASHFLOW_INPUTS.annualDeductions,
  };
}

/** A numeric text field of the take-home assumptions. */
export type CashflowAmountField = Exclude<
  keyof CashflowInputs,
  'useHourlyIncome'
>;

/**
 * Report fields the calculation uses whose text cannot be read, in form order:
 * amounts that are not one number, such as `$10km`, and an effective tax rate
 * that is not a percentage from 0 through 100 written without letters. Such
 * text reads as zero, so the owner can warn about it and mark the figures it
 * feeds. Blank amounts, negative amounts, and unused hourly fields are not
 * reported; they follow the documented zero policy.
 */
export function invalidCashflowFields(
  inputs: CashflowInputs,
): NumberFieldIssue<CashflowAmountField>[] {
  return numberFieldIssues(
    inputs,
    [
      'income',
      ...(inputs.useHourlyIncome
        ? (['hoursPerWeek', 'weeksWorked'] as const)
        : []),
      'effectiveTaxRate',
      'retirementContribution',
      'annualDeductions',
    ],
    ['effectiveTaxRate'],
  );
}

/** Read Scratchpad-style numbers with the nonnegative/invalid-to-zero policy. */
function parseAmount(raw: string): number {
  const value = parseNumberInput(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Estimate take-home pay using the gross-income tax basis and
 * zero floor. Empty, invalid, and negative amounts read as zero, as does a tax
 * rate outside 0–100% or written with letters, such as a k/m/b/t suffix.
 * Contributions and deductions do not reduce that tax basis. No resources,
 * browser state, or teardown are involved.
 */
export function calculateCashflow(inputs: CashflowInputs): CashflowResult {
  const income = parseAmount(inputs.income);
  const annualGrossIncome = inputs.useHourlyIncome
    ? income *
      parseAmount(inputs.hoursPerWeek) *
      parseAmount(inputs.weeksWorked)
    : income;
  if (!Number.isFinite(annualGrossIncome)) {
    return {
      ok: false,
      message:
        'Reduce the income or work-hour assumptions to calculate a finite annual income.',
    };
  }
  const rate = parsePercentInput(inputs.effectiveTaxRate) || 0;
  const annualTaxes = annualGrossIncome * (rate / 100);
  const annualRetirementContribution = parseAmount(
    inputs.retirementContribution,
  );
  const annualDeductions = parseAmount(inputs.annualDeductions);
  const annualNetIncome = Math.max(
    0,
    annualGrossIncome -
      annualTaxes -
      annualRetirementContribution -
      annualDeductions,
  );
  return {
    ok: true,
    cashflow: {
      annualGrossIncome,
      annualTaxes,
      annualRetirementContribution,
      annualDeductions,
      annualNetIncome,
      monthlyNetIncome: annualNetIncome / 12,
    },
  };
}

/**
 * Convert the entered income when switching annual/hourly modes. Preserve
 * empty input and numerical precision; use a zero hourly rate
 * when annual income has no positive working hours. Return null on overflow
 * so the route can retain the user's current inputs and explain the problem.
 */
export function changeCashflowIncomeMode(
  inputs: CashflowInputs,
  useHourlyIncome: boolean,
): CashflowInputs | null {
  if (inputs.useHourlyIncome === useHourlyIncome) return { ...inputs };
  if (inputs.income.trim() === '') return { ...inputs, useHourlyIncome };
  const hours =
    parseAmount(inputs.hoursPerWeek) * parseAmount(inputs.weeksWorked);
  const currentIncome = parseAmount(inputs.income);
  const annualIncome = inputs.useHourlyIncome
    ? currentIncome * hours
    : currentIncome;
  const income = useHourlyIncome
    ? hours > 0
      ? annualIncome / hours
      : 0
    : annualIncome;
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(annualIncome) ||
    !Number.isFinite(income)
  ) {
    return null;
  }
  return { ...inputs, useHourlyIncome, income: formatNumberInput(income) };
}
