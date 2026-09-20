import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CalculatorSettings,
  cashflowDefaultsError,
} from '#lib/settings/calculator-settings.svelte.js';
import { DEFAULT_LOAN_INPUTS } from '#lib/amortization/schedule.js';
import { DEFAULT_CASHFLOW_INPUTS } from '#lib/cashflow/income.js';

describe('calculator presets and reset scope', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps saved presets separate from working inputs until reset and restores them in a new owner', () => {
    const settings = new CalculatorSettings();
    const loan = {
      ...DEFAULT_LOAN_INPUTS,
      purchasePrice: '$125k',
      resolution: 'month' as const,
    };
    const cashflow = {
      ...DEFAULT_CASHFLOW_INPUTS,
      income: '$80k',
      retirementContribution: '$5k',
    };
    settings.amortizationInputs = { ...DEFAULT_LOAN_INPUTS, purchasePrice: '' };
    settings.cashflowInputs = { ...DEFAULT_CASHFLOW_INPUTS, income: '$90k' };
    settings.saveAmortizationDefaults(loan);
    settings.saveCashflowDefaults(cashflow);
    expect(settings.amortizationInputs.purchasePrice).toBe('');
    expect(settings.cashflowInputs.income).toBe('$90k');
    const restored = new CalculatorSettings();
    expect(restored.amortizationDefaults).toEqual(loan);
    expect(restored.cashflowDefaults).toEqual(cashflow);
    expect(restored.amortizationInputs.purchasePrice).toBe('');
    restored.resetCalculators();
    expect(restored.amortizationInputs).toEqual(loan);
    expect(restored.cashflowInputs).toEqual(cashflow);
    expect(new CalculatorSettings().cashflowInputs).toEqual(cashflow);
  });

  it('global reset preserves every unrelated storage entry and saved presets', () => {
    const unrelated = {
      scratchpad_input_v1: '"retained = 12; retained * 2"',
      scratchpad_result_v1: '{"value":24}',
      scratchpad_syntax_expanded_v1: 'true',
      theme: '"dark"',
      chart_tooltips_v1: 'false',
      cashflow_monthly_balance_v1: 'true',
    };
    for (const [key, value] of Object.entries(unrelated))
      localStorage.setItem(key, value);
    const settings = new CalculatorSettings();
    settings.saveAmortizationDefaults({ ...DEFAULT_LOAN_INPUTS, years: '20' });
    settings.resetCalculators();
    for (const [key, value] of Object.entries(unrelated))
      expect(localStorage.getItem(key)).toBe(value);
    expect(settings.amortizationDefaults.years).toBe('20');
    expect(settings.amortizationInputs.years).toBe('20');
  });

  it('rejects invalid presets without overwriting saved defaults', () => {
    const settings = new CalculatorSettings();
    expect(() =>
      settings.saveAmortizationDefaults({
        ...DEFAULT_LOAN_INPUTS,
        downPayment: '-2',
      }),
    ).toThrow();
    expect(() =>
      settings.saveCashflowDefaults({
        ...DEFAULT_CASHFLOW_INPUTS,
        income: 'invalid',
      }),
    ).toThrow();
    expect(() =>
      settings.saveCashflowDefaults({
        ...DEFAULT_CASHFLOW_INPUTS,
        effectiveTaxRate: '101',
      }),
    ).toThrow();
    expect(settings.amortizationDefaults).toEqual(DEFAULT_LOAN_INPUTS);
    expect(settings.cashflowDefaults).toEqual(DEFAULT_CASHFLOW_INPUTS);
    expect(
      cashflowDefaultsError({ ...DEFAULT_CASHFLOW_INPUTS, hoursPerWeek: '' }),
    ).toBeDefined();
  });

  it('normalizes malformed stored presets without hiding incomplete working edits', () => {
    localStorage.setItem(
      'amortization_defaults_v1',
      JSON.stringify({ ...DEFAULT_LOAN_INPUTS, years: '-1' }),
    );
    localStorage.setItem(
      'cashflow_defaults_v1',
      JSON.stringify({ ...DEFAULT_CASHFLOW_INPUTS, income: 'n/a' }),
    );
    localStorage.setItem(
      'amortization_inputs_v1',
      JSON.stringify({ ...DEFAULT_LOAN_INPUTS, annualRate: '' }),
    );
    const settings = new CalculatorSettings();
    expect(settings.amortizationDefaults).toEqual(DEFAULT_LOAN_INPUTS);
    expect(settings.cashflowDefaults).toEqual(DEFAULT_CASHFLOW_INPUTS);
    expect(settings.amortizationInputs.annualRate).toBe('');
  });

  it('retains settings and resets within the owning app when browser storage is denied', () => {
    const get = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const set = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    try {
      const settings = new CalculatorSettings();
      settings.saveCashflowDefaults({
        ...DEFAULT_CASHFLOW_INPUTS,
        income: '$75k',
      });
      settings.cashflowInputs = { ...DEFAULT_CASHFLOW_INPUTS, income: '$40k' };
      settings.resetCalculators();
      expect(settings.cashflowInputs.income).toBe('$75k');
      expect(new CalculatorSettings().cashflowDefaults).toEqual(
        DEFAULT_CASHFLOW_INPUTS,
      );
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('returns copies so unsaved edits cannot mutate a preset or another working draft', () => {
    const settings = new CalculatorSettings();
    const draft = settings.amortizationDefaults;
    draft.purchasePrice = '';
    expect(settings.amortizationDefaults.purchasePrice).toBe(
      DEFAULT_LOAN_INPUTS.purchasePrice,
    );
    const inputs = settings.cashflowInputs;
    inputs.income = '';
    expect(settings.cashflowInputs.income).toBe(DEFAULT_CASHFLOW_INPUTS.income);
  });
});
