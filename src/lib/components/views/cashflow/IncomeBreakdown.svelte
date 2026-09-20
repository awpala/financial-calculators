<!--
@component
Presents the balance-sheet line items and net income as shares of gross income. The route owns the calculation and display period; this view owns the slice colors, transient slice hover, and the decision that gross income cannot be divided into shares at all.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import PieChart from '#lib/components/charts/PieChart.svelte';
  import ChartTooltip from '#lib/components/charts/ChartTooltip.svelte';
  import WarnNote from '#lib/components/elements/WarnNote.svelte';
  import type {
    PieSlice,
    PieSliceHoverInfo,
  } from '#lib/components/charts/types.js';
  import type { Cashflow, CashflowAmountField } from '#lib/cashflow/income.js';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  /** Calculated annual values and the fields their text could not be read from. */
  type Props = {
    /** Valid cashflow calculation, or undefined when values overflow. */
    cashflow?: Cashflow;
    /** True reports monthly averages in hover amounts; false reports annual totals. Shares are the same either way. */
    monthlyBalance: boolean;
    /** Whether slice hover may accent a wedge and display a floating tooltip. */
    tooltipsEnabled: boolean;
    /** Fields whose text is not a number; their figures read as zero here. Defaults to none. */
    invalid?: readonly CashflowAmountField[];
  };
  let {
    cashflow,
    monthlyBalance,
    tooltipsEnabled,
    invalid = [],
  }: Props = $props();
  // What is kept wears the emerald this page already uses for a calculated
  // figure. What is taken out wears one red ramp read by size, so the deepest
  // red always marks the largest deduction; a shade therefore follows the
  // magnitude rather than the line item, and can move between rows as the
  // inputs change. The legend carries every label and share, which is the
  // relief the lightest red needs against a white card.
  const NET_INCOME_COLOR = '#047857';
  /** Deduction reds, lightest first, matching the smallest-to-largest order. */
  const DEDUCTION_RAMP = ['#f29191', '#e04a3f', '#a21313'];
  const chartId = $props.id();
  // The chart's own legend shares and the tooltip must agree to the digit, so
  // one formatter serves both rather than each rounding on its own.
  const sharePercent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  // Dividing every slice by twelve leaves the wedges identical and reports the
  // amounts the rest of the page is showing, so the pie cannot contradict the
  // balance sheet beside it.
  const divisor = $derived(monthlyBalance ? 12 : 1);
  const grossIncome = $derived(cashflow?.annualGrossIncome ?? 0);
  const withheld = $derived(
    cashflow
      ? cashflow.annualTaxes +
          cashflow.annualRetirementContribution +
          cashflow.annualDeductions
      : 0,
  );
  // Taxes and deductions past gross income are what the model's zero floor
  // absorbs, and the four figures then total more than the whole they would be
  // shares of. Half a cent of tolerance keeps rounding in the floating-point
  // subtraction from reading as a real overdraw at a currency scale.
  const overdrawn = $derived(withheld - grossIncome > 0.005);
  const deductions = $derived(
    cashflow
      ? [
          {
            id: 'taxes',
            label: 'Taxes',
            value: cashflow.annualTaxes / divisor,
          },
          {
            id: 'retirement',
            label: 'Retirement contributions',
            value: cashflow.annualRetirementContribution / divisor,
          },
          {
            id: 'deductions',
            label: 'Other deductions',
            value: cashflow.annualDeductions / divisor,
          },
        ]
      : [],
  );
  // Order the deductions from smallest to largest and hand out the ramp in that
  // order, so the wedges and the legend they key read as one light-to-dark
  // progression. Sorting a copy leaves the derived array above untouched, and
  // the index tiebreak keeps equal amounts, including three zeros, stable.
  const rampedDeductions = $derived(
    deductions
      .map((deduction, index) => ({ deduction, index }))
      .sort(
        (a, b) => a.deduction.value - b.deduction.value || a.index - b.index,
      )
      .map(({ deduction }, position) => ({
        ...deduction,
        color: DEDUCTION_RAMP[Math.min(position, DEDUCTION_RAMP.length - 1)],
      })),
  );
  // What is kept leads, then the deductions that reduced it.
  const slices = $derived<PieSlice[]>(
    cashflow && !overdrawn
      ? [
          {
            id: 'net',
            label: 'Net income',
            value: cashflow.annualNetIncome / divisor,
            color: NET_INCOME_COLOR,
          },
          ...rampedDeductions,
        ]
      : [],
  );
  const emptyMessage = $derived(
    cashflow === undefined
      ? 'Enter valid income assumptions to see the breakdown.'
      : overdrawn
        ? 'Taxes and deductions exceed gross income, so they are not shares of it.'
        : 'Enter a gross income to see how it divides.',
  );
  /** Hover identity tied to the exact slices that produced it. */
  type HoverState = {
    /** Pointer position and hovered slice. */
    info: PieSliceHoverInfo;
    /** Slice identity used to discard stale hover after a recalculation. */
    source: readonly PieSlice[];
  };
  let hovered = $state.raw<HoverState | null>(null);
  const hover = $derived(
    tooltipsEnabled && hovered?.source === slices ? hovered.info : null,
  );
</script>

<svelte:document
  onscrollcapture={() => {
    hovered = null;
  }}
/>

{#if hover}
  <ChartTooltip clientX={hover.clientX} clientY={hover.clientY}>
    <span class="font-semibold text-slate-900 dark:text-slate-100"
      >{hover.label}:</span
    >
    {money(hover.value)} · {sharePercent.format(hover.share)} of gross income
  </ChartTooltip>
{/if}

<Card
  as="section"
  class="min-w-0 space-y-4 p-5 sm:p-6"
  aria-labelledby={`${chartId}-heading`}
>
  <div>
    <h2 id={`${chartId}-heading`} class="text-base font-semibold">
      Share of gross income
    </h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Gross income is the whole pie; each line item and your take-home pay is a
      share of it.
    </p>
  </div>
  {#if invalid.length > 0}
    <WarnNote>
      Values that are not numbers read as zero, so these shares understate the
      line items they come from.
    </WarnNote>
  {/if}
  <PieChart
    {slices}
    valueLabel={`${monthlyBalance ? 'monthly' : 'annual'} income and deductions`}
    formatValue={money}
    formatShare={(share) => sharePercent.format(share)}
    height={274}
    legendAlign="center"
    legendDividerAfterIndexes={[0]}
    hoverEnabled={tooltipsEnabled}
    {emptyMessage}
    onSliceHover={(info) => {
      hovered = info && tooltipsEnabled ? { info, source: slices } : null;
    }}
  />
</Card>
