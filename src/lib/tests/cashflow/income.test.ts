import { describe, expect, it } from 'vitest';
import {
  calculateCashflow,
  changeCashflowIncomeMode,
  DEFAULT_CASHFLOW_INPUTS,
  invalidCashflowFields,
  normalizeCashflowInputs,
  type CashflowInputs,
} from '#lib/cashflow/income.js';

function calculate(overrides: Partial<CashflowInputs> = {}) {
  const result = calculateCashflow({
    ...DEFAULT_CASHFLOW_INPUTS,
    ...overrides,
  });
  if (!result.ok) throw new Error(result.message);
  return result.cashflow;
}

describe('cashflow income', () => {
  it('accepts Scratchpad number notation in every cashflow field and during conversion', () => {
    const inputs = {
      ...DEFAULT_CASHFLOW_INPUTS,
      income: '$125k',
      hoursPerWeek: '.04K',
      weeksWorked: '5_2',
      effectiveTaxRate: '2_4',
      retirementContribution: '$12k',
      annualDeductions: '$.006m',
    };
    expect(calculate(inputs)).toMatchObject({
      annualGrossIncome: 125000,
      annualTaxes: 30000,
      annualNetIncome: 77000,
    });
    const hourly = changeCashflowIncomeMode(inputs, true)!;
    expect(calculate(hourly).annualGrossIncome).toBeCloseTo(125000, 8);
    expect(calculate(hourly).annualNetIncome).toBeCloseTo(77000, 8);
  });
  it('matches the reference take-home estimate and reconciles its annual balance sheet', () => {
    const result = calculate();
    expect(result).toEqual({
      annualGrossIncome: 120000,
      annualTaxes: 28800,
      annualRetirementContribution: 12000,
      annualDeductions: 0,
      annualNetIncome: 79200,
      monthlyNetIncome: 6600,
    });
    expect(
      result.annualGrossIncome -
        result.annualTaxes -
        result.annualRetirementContribution -
        result.annualDeductions,
    ).toBe(result.annualNetIncome);
  });

  it('annualizes hourly pay using both work assumptions, including fractions', () => {
    const result = calculate({
      useHourlyIncome: true,
      income: '50',
      hoursPerWeek: '37.5',
      weeksWorked: '48.5',
      annualDeductions: '1,200',
    });
    expect(result.annualGrossIncome).toBe(90937.5);
    expect(result.annualTaxes).toBe(21825);
    expect(result.annualNetIncome).toBe(55912.5);
    expect(result.monthlyNetIncome).toBe(4659.375);
  });

  it('keeps the reference gross-income tax basis when contributions change', () => {
    expect(
      calculate({
        retirementContribution: '24,000',
        annualDeductions: '$6,000',
      }),
    ).toMatchObject({
      annualTaxes: 28800,
      annualNetIncome: 61200,
      monthlyNetIncome: 5100,
    });
  });

  it('converts modes without cents-rounding drift', () => {
    let inputs: CashflowInputs = { ...DEFAULT_CASHFLOW_INPUTS };
    for (let index = 0; index < 20; index += 1) {
      inputs = changeCashflowIncomeMode(inputs, !inputs.useHourlyIncome)!;
      expect(calculate(inputs).annualGrossIncome).toBeCloseTo(120000, 8);
      expect(calculate(inputs).monthlyNetIncome).toBeCloseTo(6600, 8);
    }
    expect(inputs.useHourlyIncome).toBe(false);
  });

  it('keeps annual salary independent of unused hourly assumptions', () => {
    expect(calculate({ hoursPerWeek: '', weeksWorked: 'n/a' })).toEqual(
      calculate(),
    );
  });

  it.each(['', 'invalid', '-500', 'Infinity', '1e309'])(
    'retains the reference zero interpretation of income %j',
    (income) => expect(calculate({ income }).annualGrossIncome).toBe(0),
  );

  it('reports unreadable fields, such as stacked suffixes, while still reading them as zero', () => {
    const inputs = { ...DEFAULT_CASHFLOW_INPUTS, annualDeductions: '$10km' };
    expect(invalidCashflowFields(inputs)).toEqual([
      { field: 'annualDeductions', problem: 'malformed' },
    ]);
    expect(calculate(inputs).annualDeductions).toBe(0);
    expect(
      invalidCashflowFields({
        ...DEFAULT_CASHFLOW_INPUTS,
        income: '12x',
        effectiveTaxRate: '24%',
        retirementContribution: '1kk',
      }),
    ).toEqual([
      { field: 'income', problem: 'malformed' },
      { field: 'effectiveTaxRate', problem: 'percent' },
      { field: 'retirementContribution', problem: 'malformed' },
    ]);
  });

  it('leaves blank, negative, valid, and unused hourly fields unreported', () => {
    expect(invalidCashflowFields(DEFAULT_CASHFLOW_INPUTS)).toEqual([]);
    const inputs = {
      ...DEFAULT_CASHFLOW_INPUTS,
      income: '  ',
      annualDeductions: '-500',
      retirementContribution: '$10k',
      effectiveTaxRate: '',
      hoursPerWeek: 'n/a',
    };
    expect(invalidCashflowFields(inputs)).toEqual([]);
    expect(invalidCashflowFields({ ...inputs, useHourlyIncome: true })).toEqual(
      [{ field: 'hoursPerWeek', problem: 'malformed' }],
    );
  });

  it.each(['-10', '150', '100.5', '0.24k', '24k', '1m', 'twenty', '24%'])(
    'flags the tax rate %j and reads it as zero rather than clamping it',
    (effectiveTaxRate) => {
      const inputs = { ...DEFAULT_CASHFLOW_INPUTS, effectiveTaxRate };
      expect(invalidCashflowFields(inputs)).toEqual([
        { field: 'effectiveTaxRate', problem: 'percent' },
      ]);
      expect(calculate(inputs).annualTaxes).toBe(0);
    },
  );

  it.each([
    ['0', 0],
    ['24', 28_800],
    ['$24', 28_800],
    ['100', 120_000],
  ])(
    'accepts the tax rate %j from 0 through 100',
    (effectiveTaxRate, taxes) => {
      const inputs = { ...DEFAULT_CASHFLOW_INPUTS, effectiveTaxRate };
      expect(invalidCashflowFields(inputs)).toEqual([]);
      expect(calculate(inputs).annualTaxes).toBe(taxes);
    },
  );

  it('floors net income at zero', () => {
    expect(calculate({ effectiveTaxRate: '100' }).annualNetIncome).toBe(0);
    expect(
      calculate({ retirementContribution: '200,000' }).monthlyNetIncome,
    ).toBe(0);
  });

  it('preserves empty income on mode changes and safely handles zero work hours', () => {
    expect(
      changeCashflowIncomeMode({ ...DEFAULT_CASHFLOW_INPUTS, income: '' }, true)
        ?.income,
    ).toBe('');
    const inputs = changeCashflowIncomeMode(
      { ...DEFAULT_CASHFLOW_INPUTS, hoursPerWeek: '0' },
      true,
    )!;
    expect(inputs.income).toBe('0');
    expect(calculate(inputs).annualGrossIncome).toBe(0);
  });

  it('rejects overflowing annualization and conversion without mutating the original inputs', () => {
    const inputs = {
      ...DEFAULT_CASHFLOW_INPUTS,
      useHourlyIncome: true,
      income: '1' + '0'.repeat(308),
    };
    expect(calculateCashflow(inputs).ok).toBe(false);
    expect(changeCashflowIncomeMode(inputs, false)).toBeNull();
    expect(inputs.income).toBe('1' + '0'.repeat(308));
    expect(inputs.useHourlyIncome).toBe(true);
    expect(
      calculate({ income: '1' + '0'.repeat(308), effectiveTaxRate: '100' })
        .annualTaxes,
    ).toBe(1e308);
  });

  it('normalizes each persisted field while retaining intentional empty inputs', () => {
    expect(normalizeCashflowInputs(null)).toEqual(DEFAULT_CASHFLOW_INPUTS);
    expect(
      normalizeCashflowInputs({
        useHourlyIncome: 'true',
        income: '',
        hoursPerWeek: 40,
        weeksWorked: '48',
        effectiveTaxRate: false,
        retirementContribution: null,
        annualDeductions: '200',
      }),
    ).toEqual({
      ...DEFAULT_CASHFLOW_INPUTS,
      income: '',
      weeksWorked: '48',
      annualDeductions: '200',
    });
    expect(
      normalizeCashflowInputs({ useHourlyIncome: true }).useHourlyIncome,
    ).toBe(true);
  });
});
