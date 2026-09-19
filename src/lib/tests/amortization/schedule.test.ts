import { describe, expect, it } from 'vitest';
import {
  calculateAmortization,
  DEFAULT_LOAN_INPUTS,
  getResolutionPayment,
  getResolutionPaymentLabel,
  groupPayments,
  normalizeLoanInputs,
  parseLoanNumber,
  type LoanInputs,
} from '#lib/amortization/schedule.js';

function calculate(overrides: Partial<LoanInputs> = {}) {
  const result = calculateAmortization({
    ...DEFAULT_LOAN_INPUTS,
    ...overrides,
  });
  if (!result.ok) throw new Error(result.message);
  return result.loan;
}

describe('fixed-rate amortization', () => {
  it('matches the reference mortgage and reconciles principal, interest, and balance', () => {
    const loan = calculate();
    expect(loan.principal).toBe(360000);
    expect(loan.monthlyPayment).toBeCloseTo(2275.4448845747, 8);
    expect(loan.payments).toHaveLength(360);
    expect(loan.payments[0].interest).toBeCloseTo(1950, 8);
    expect(
      loan.payments.reduce((sum, row) => sum + row.principal, 0),
    ).toBeCloseTo(loan.principal, 6);
    expect(loan.payments.at(-1)?.balance).toBe(0);
    expect(loan.totalPaid).toBeCloseTo(loan.monthlyPayment * 360, 6);
    expect(loan.totalPaid).toBeCloseTo(loan.principal + loan.totalInterest, 6);
  });

  it('supports interest-free loans and a purchase paid entirely upfront', () => {
    const loan = calculate({ annualRate: '0' });
    expect(loan.monthlyPayment).toBe(1000);
    expect(loan.totalInterest).toBe(0);
    expect(loan.payments.every((row) => row.principal === 1000)).toBe(true);
    const paid = calculate({ downPayment: '100' });
    expect(paid.monthlyPayment).toBe(0);
    expect(paid.payments).toEqual([]);
    expect(paid.totalPaid).toBe(0);
  });

  it('uses equivalent amount and percent down payments', () => {
    expect(
      calculate({ downPayment: '$90,000', downPaymentPercent: false }),
    ).toEqual(calculate());
  });

  it('accepts Scratchpad number notation in every loan field', () => {
    expect(
      calculate({
        purchasePrice: '$.45M',
        downPayment: '$90k',
        downPaymentPercent: false,
        years: '.03k',
        annualRate: '6_5',
      }),
    ).toEqual(
      calculate({
        downPayment: '90000',
        downPaymentPercent: false,
        annualRate: '65',
      }),
    );
  });

  it.each(['year', 'quarter', 'month'] as const)(
    'preserves totals when grouped by %s',
    (resolution) => {
      const loan = calculate();
      const periods = groupPayments(loan.payments, resolution);
      expect(periods).toHaveLength(
        resolution === 'year' ? 30 : resolution === 'quarter' ? 120 : 360,
      );
      expect(periods.reduce((sum, row) => sum + row.interest, 0)).toBeCloseTo(
        loan.totalInterest,
        6,
      );
      expect(periods.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(
        loan.principal,
        6,
      );
      expect(periods.at(-1)?.balance).toBe(0);
      expect(new Set(periods.map((row) => row.key)).size).toBe(periods.length);
    },
  );

  it.each([
    { purchasePrice: '' },
    { purchasePrice: '0' },
    { purchasePrice: '-1' },
    { purchasePrice: '1e309' },
    { purchasePrice: '2,,00' },
    { downPayment: '101' },
    { downPayment: '-2' },
    { downPayment: '500000', downPaymentPercent: false },
    { years: '0' },
    { years: '1.5' },
    { years: '1000000' },
    { annualRate: '-1' },
    { annualRate: '101' },
    { annualRate: 'text' },
  ])(
    'rejects invalid assumptions without allocating a schedule: %j',
    (overrides) => {
      expect(
        calculateAmortization({ ...DEFAULT_LOAN_INPUTS, ...overrides }).ok,
      ).toBe(false);
    },
  );

  it('stays finite and pays off without a balloon at extreme supported rates', () => {
    for (const annualRate of ['0.000000000001', '100']) {
      const loan = calculate({ annualRate, years: '100' });
      expect(Number.isFinite(loan.monthlyPayment)).toBe(true);
      expect(loan.totalPaid).toBeCloseTo(loan.monthlyPayment * 1200, 4);
      const last = loan.payments.at(-1)!;
      expect(last.balance).toBe(0);
      expect(last.principal + last.interest).toBeCloseTo(
        loan.monthlyPayment,
        5,
      );
    }
  });
});

describe('resolution payment summary', () => {
  it('scales the monthly payment to the selected resolution', () => {
    const loan = calculate();
    expect(getResolutionPayment(loan, 'month')).toBeCloseTo(
      loan.monthlyPayment,
      8,
    );
    expect(getResolutionPayment(loan, 'quarter')).toBeCloseTo(
      loan.monthlyPayment * 3,
      8,
    );
    expect(getResolutionPayment(loan, 'year')).toBeCloseTo(
      loan.monthlyPayment * 12,
      8,
    );
  });

  it('labels the summary figure to match the selected resolution', () => {
    expect(getResolutionPaymentLabel('month')).toBe('Monthly payment');
    expect(getResolutionPaymentLabel('quarter')).toBe('Quarterly payment');
    expect(getResolutionPaymentLabel('year')).toBe('Annual payment');
  });
});

describe('loan input persistence', () => {
  it('normalizes malformed storage field by field and preserves in-progress edits', () => {
    expect(normalizeLoanInputs(null)).toEqual(DEFAULT_LOAN_INPUTS);
    expect(
      normalizeLoanInputs({
        years: '',
        downPaymentPercent: 'true',
        resolution: 'bad',
      }),
    ).toEqual({ ...DEFAULT_LOAN_INPUTS, years: '' });
    expect(
      normalizeLoanInputs({ resolution: 'month', downPaymentPercent: false })
        .resolution,
    ).toBe('month');
  });

  it('accepts currency input without silently repairing malformed numbers', () => {
    expect(parseLoanNumber('$1,250.50')).toBe(1250.5);
    expect(parseLoanNumber('.5')).toBe(0.5);
    expect(parseLoanNumber('12x')).toBeNaN();
    expect(parseLoanNumber('')).toBeNaN();
  });
});
