<!--
@component
Presents income and deductions annually or as monthly averages. It divides the supplied annual figures for display only; the route owns the period preference and persistence.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  import type { Cashflow } from '#lib/cashflow/income.js';
  /** Calculated annual values and the route-owned display period. */
  type Props = {
    /** Valid cashflow calculation, or undefined when values overflow. */
    cashflow?: Cashflow;
    /** True displays monthly averages; false displays annual figures. */
    monthlyBalance: boolean;
    /** Reports the selected period so the route can persist it. */
    onPeriodChange: (monthly: boolean) => void;
  };
  let { cashflow, monthlyBalance, onPeriodChange }: Props = $props();
  const balancePeriod = $derived(monthlyBalance ? 'Monthly' : 'Annual');
  const balanceDivisor = $derived(monthlyBalance ? 12 : 1);
  const rows = $derived([
    {
      label: `${balancePeriod} gross income`,
      value: cashflow?.annualGrossIncome,
      sign: '+',
    },
    {
      label: `${balancePeriod} taxes`,
      value: cashflow?.annualTaxes,
      sign: '−',
    },
    {
      label: `${balancePeriod} retirement contributions`,
      value: cashflow?.annualRetirementContribution,
      sign: '−',
    },
    {
      label: `Other ${balancePeriod.toLowerCase()} deductions`,
      value: cashflow?.annualDeductions,
      sign: '−',
    },
  ]);
</script>

<Card
  as="section"
  class="space-y-5 p-5 sm:p-6"
  aria-label={`${balancePeriod} balance sheet`}
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-base font-semibold">{balancePeriod} balance sheet</h2>
    <OptionSwitch
      firstLabel="Annual"
      secondLabel="Monthly"
      checked={monthlyBalance}
      label="Show monthly balance sheet"
      onChange={onPeriodChange}
    />
  </div>
  <dl class="space-y-4 text-sm">
    {#each rows as row (row.label)}
      <div
        class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4"
      >
        <dt class="text-slate-600 dark:text-slate-400">{row.label}</dt>
        <dd class="text-right font-medium break-all tabular-nums">
          {row.value === undefined
            ? '—'
            : `${row.sign}${money(row.value / balanceDivisor)}`}
        </dd>
      </div>
    {/each}
    <div
      class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 border-t border-slate-200 pt-4 dark:border-slate-700"
    >
      <dt class="font-semibold">{balancePeriod} net income</dt>
      <dd
        class="text-right text-lg font-semibold break-all text-emerald-700 tabular-nums dark:text-emerald-400"
      >
        {cashflow ? money(cashflow.annualNetIncome / balanceDivisor) : '—'}
      </dd>
    </div>
  </dl>
</Card>
