import { parseNumberInput } from '#lib/calculator/presentation/number-input.js';

/** Grouping used by both the payment chart and schedule table. */
export type Resolution = 'year' | 'quarter' | 'month';

/** One supported grouping and the label shared by working and preset controls. */
type ResolutionOption = {
  /** Grouping understood by the amortization model. */
  value: Resolution;
  /** Visible label in the contextual rail and settings select. */
  label: string;
};

/** Ordered payment groupings shared by the chart/table rail and Reset presets. */
export const PAYMENT_RESOLUTIONS: readonly ResolutionOption[] = [
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'month', label: 'Month' },
];

/** Editable loan assumptions, stored as text so incomplete edits remain visible. */
export type LoanInputs = {
  /** Purchase price in USD, allowing Scratchpad's currency and magnitude notation. */
  purchasePrice: string;
  /** Down payment in USD or percent, according to downPaymentPercent. */
  downPayment: string;
  /** Whether downPayment is a percentage of purchasePrice. */
  downPaymentPercent: boolean;
  /** Whole years from 1 through 100. */
  years: string;
  /** Nominal annual rate in percent, from 0 through 100. */
  annualRate: string;
  /** Period grouping for the chart and table. */
  resolution: Resolution;
};

/** Default illustration matching the reference amortization calculator. */
export const DEFAULT_LOAN_INPUTS: Readonly<LoanInputs> = {
  purchasePrice: '450,000',
  downPayment: '20',
  downPaymentPercent: true,
  years: '30',
  annualRate: '6.5',
  resolution: 'year',
};

/** One monthly payment; money remains unrounded until presentation. */
export type Payment = {
  /** One-based month counted from the beginning of the loan. */
  month: number;
  /** Amount of this payment that retires principal. */
  principal: number;
  /** Interest accrued on the preceding balance. */
  interest: number;
  /** Principal remaining immediately after this payment. */
  balance: number;
};

/** A validated fixed-rate loan and its payment schedule, all money in USD. */
export type Amortization = {
  /** Amount financed after the down payment. */
  principal: number;
  /** Upfront payment, excluded from totalPaid. */
  downPayment: number;
  /** Regular monthly principal and interest payment. */
  monthlyPayment: number;
  /** Total interest across the monthly schedule. */
  totalInterest: number;
  /** Financed principal plus interest, excluding the down payment. */
  totalPaid: number;
  /** Monthly payments ending at a zero balance. */
  payments: Payment[];
};

/** Validated calculation or a user-facing explanation of invalid assumptions. */
export type LoanResult =
  | {
      /** Successful fixed-rate calculation. */ ok: true;
      /** Calculated schedule. */ loan: Amortization;
    }
  | {
      /** Invalid input; no figures should be displayed. */ ok: false;
      /** Validation message. */ message: string;
    };

/** A chart/table period composed of one or more consecutive monthly payments. */
export type PaymentPeriod = {
  /** Unique key including year and, where applicable, month or quarter. */
  key: string;
  /** Short axis label within its year. */
  label: string;
  /** Year label for a grouped secondary axis. */
  year: string;
  /** Principal retired during the period. */
  principal: number;
  /** Interest paid during the period. */
  interest: number;
  /** Balance after the last payment of the period. */
  balance: number;
};

/** Restore only known, correctly typed fields; missing fields retain their defaults. */
export function normalizeLoanInputs(raw: unknown): LoanInputs {
  const input =
    raw && typeof raw === 'object' ? (raw as Partial<LoanInputs>) : {};
  return {
    purchasePrice:
      typeof input.purchasePrice === 'string'
        ? input.purchasePrice
        : DEFAULT_LOAN_INPUTS.purchasePrice,
    downPayment:
      typeof input.downPayment === 'string'
        ? input.downPayment
        : DEFAULT_LOAN_INPUTS.downPayment,
    downPaymentPercent:
      typeof input.downPaymentPercent === 'boolean'
        ? input.downPaymentPercent
        : DEFAULT_LOAN_INPUTS.downPaymentPercent,
    years:
      typeof input.years === 'string' ? input.years : DEFAULT_LOAN_INPUTS.years,
    annualRate:
      typeof input.annualRate === 'string'
        ? input.annualRate
        : DEFAULT_LOAN_INPUTS.annualRate,
    resolution:
      input.resolution === 'month' || input.resolution === 'quarter'
        ? input.resolution
        : 'year',
  };
}

/** Parse a nonnegative Scratchpad-style number; malformed or empty text returns NaN. */
export function parseLoanNumber(source: string): number {
  const value = parseNumberInput(source);
  return value >= 0 ? value : Number.NaN;
}

/**
 * Compute monthly compounding and end-of-month payments for a fixed-rate loan.
 * Validate before allocating the schedule. Terms are bounded to 1,200 months,
 * money to one trillion USD, and rates to 100% annually. Taxes, insurance,
 * fees, extra payments, and lender-specific rounding are outside this model.
 */
export function calculateAmortization(input: LoanInputs): LoanResult {
  const price = parseLoanNumber(input.purchasePrice);
  const down = parseLoanNumber(input.downPayment);
  const years = parseLoanNumber(input.years);
  const rate = parseLoanNumber(input.annualRate);
  if (!Number.isFinite(price) || price <= 0 || price > 1e12)
    return {
      ok: false,
      message:
        'Enter a purchase price greater than $0 and no more than $1 trillion.',
    };
  if (!Number.isFinite(down) || down > (input.downPaymentPercent ? 100 : price))
    return {
      ok: false,
      message: input.downPaymentPercent
        ? 'Enter a down payment from 0% to 100%.'
        : 'Enter a down payment from $0 to the purchase price.',
    };
  if (!Number.isInteger(years) || years < 1 || years > 100)
    return {
      ok: false,
      message: 'Enter a whole loan term from 1 to 100 years.',
    };
  if (!Number.isFinite(rate) || rate > 100)
    return {
      ok: false,
      message: 'Enter an annual interest rate from 0% to 100%.',
    };

  const downPayment = input.downPaymentPercent ? (price * down) / 100 : down;
  const principal = price - downPayment;
  const months = years * 12;
  const monthlyRate = rate / 1200;
  // expm1/log1p avoid cancellation for very small positive interest rates.
  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) /
        -Math.expm1(-months * Math.log1p(monthlyRate));
  const payments: Payment[] = [];
  let balance = principal;
  let totalInterest = 0;
  for (let month = 1; month <= months && balance > 0; month++) {
    const interest = balance * monthlyRate;
    // The present value of the remaining payments avoids a balloon caused by
    // repeatedly subtracting tiny principal amounts at high rates/long terms.
    const nextBalance =
      monthlyRate === 0
        ? (principal * (months - month)) / months
        : (principal *
            -Math.expm1(-(months - month) * Math.log1p(monthlyRate))) /
          -Math.expm1(-months * Math.log1p(monthlyRate));
    const principalPaid = Math.max(0, balance - nextBalance);
    balance = Math.max(0, nextBalance);
    totalInterest += interest;
    payments.push({ month, principal: principalPaid, interest, balance });
  }
  return {
    ok: true,
    loan: {
      principal,
      downPayment,
      monthlyPayment,
      totalInterest,
      totalPaid: principal + totalInterest,
      payments,
    },
  };
}

/** Aggregate one schedule for chart and table without changing its monthly values. */
export function groupPayments(
  payments: readonly Payment[],
  resolution: Resolution,
): PaymentPeriod[] {
  const periods = new Map<string, PaymentPeriod>();
  for (const payment of payments) {
    const year = `Y${Math.floor((payment.month - 1) / 12) + 1}`;
    const month = ((payment.month - 1) % 12) + 1;
    const label =
      resolution === 'year'
        ? year
        : resolution === 'quarter'
          ? `Q${Math.ceil(month / 3)}`
          : `M${month}`;
    const key = resolution === 'year' ? year : `${year}-${label}`;
    const period = periods.get(key) ?? {
      key,
      label,
      year,
      principal: 0,
      interest: 0,
      balance: 0,
    };
    period.principal += payment.principal;
    period.interest += payment.interest;
    period.balance = payment.balance;
    periods.set(key, period);
  }
  return [...periods.values()];
}
