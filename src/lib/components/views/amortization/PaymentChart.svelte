<!--
@component
Owns payment-chart presentation, responsive label density, and transient segment hover. The route supplies grouped payments and preferences; stale hover is ignored when data changes, and declarative scroll handling is released on teardown.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import StackedBarChart from '#lib/components/charts/StackedBarChart.svelte';
  import ChartTooltip from '#lib/components/charts/ChartTooltip.svelte';
  import type {
    BarSegmentHoverInfo,
    StackedBarSeries,
  } from '#lib/components/charts/types.js';
  import type {
    PaymentPeriod,
    Resolution,
  } from '#lib/amortization/schedule.js';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  /** Grouped schedule data and chart presentation preferences. */
  type Props = {
    /** Route-owned grouped payments; replace the array when recalculating. */
    periods: readonly PaymentPeriod[];
    /** Grouping used for axis and year labels. */
    resolution: Resolution;
    /** Whether an empty schedule represents a fully paid purchase. */
    paidInFull: boolean;
    /** Whether segment hover may display a floating tooltip. */
    tooltipsEnabled: boolean;
  };
  let { periods, resolution, paidInFull, tooltipsEnabled }: Props = $props();
  /** Hover identity tied to the exact schedule that produced it. */
  type HoverState = {
    /** Pointer position and selected segment. */
    info: BarSegmentHoverInfo;
    /** Schedule identity used to discard stale hover after recalculation. */
    source: readonly PaymentPeriod[];
  };
  let hovered = $state.raw<HoverState | null>(null);
  const hover = $derived(
    tooltipsEnabled && hovered?.source === periods ? hovered.info : null,
  );
  const hoveredPeriod = $derived(
    hover
      ? periods.find((period) => period.key === hover.groupLabel)
      : undefined,
  );
  const chartId = $props.id();
  const compactCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const series = $derived<StackedBarSeries[]>([
    {
      id: 'payment-split',
      label: 'Payment split',
      stacks: periods.map((period) => [
        {
          id: 'principal',
          label: 'Principal',
          value: period.principal,
          color: '#16a34a',
        },
        {
          id: 'interest',
          label: 'Interest',
          value: period.interest,
          color: '#dc2626',
        },
      ]),
    },
  ]);
  const legendItems = [
    { id: 'principal', label: 'Principal', color: '#16a34a' },
    { id: 'interest', label: 'Interest', color: '#dc2626' },
  ];
  const yearGroups = $derived.by(() => {
    if (resolution === 'year') return [];
    const groups: { fromIndex: number; toIndex: number; label: string }[] = [];
    periods.forEach((period, index) => {
      const last = groups.at(-1);
      if (last?.label === period.year) last.toIndex = index;
      else
        groups.push({ fromIndex: index, toIndex: index, label: period.year });
    });
    return groups;
  });
  let chartWidth = $state(640);
  const plotWidth = $derived(Math.max(1, chartWidth - 80));
  const labelStride = $derived(
    Math.max(1, Math.ceil((periods.length * 28) / plotWidth)),
  );
  const showPeriodLabels = $derived(
    resolution === 'year' || plotWidth / periods.length >= 24,
  );
  const displayLabels = $derived(
    periods.map((period, index) =>
      showPeriodLabels && index % labelStride === 0 ? period.label : '',
    ),
  );
  const yearLabelStride = $derived(
    Math.max(1, Math.ceil((yearGroups.length * 32) / plotWidth)),
  );
  const visibleYearGroups = $derived(
    yearGroups.filter((_, index) => index % yearLabelStride === 0),
  );
</script>

<svelte:document
  onscrollcapture={() => {
    hovered = null;
  }}
/>

{#if tooltipsEnabled && hover && hoveredPeriod}
  <ChartTooltip clientX={hover.clientX} clientY={hover.clientY}>
    {hover.groupLabel} ·
    <span class="font-semibold text-slate-900 dark:text-slate-100"
      >{hover.segment.label}:</span
    >
    {money(
      hover.segment.id === 'principal'
        ? hoveredPeriod.principal
        : hoveredPeriod.interest,
    )}
  </ChartTooltip>
{/if}

<Card
  as="section"
  class="min-w-0 space-y-4 p-4 sm:p-6"
  aria-labelledby={`${chartId}-heading`}
>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 id={`${chartId}-heading`} class="text-base font-semibold">
        Principal vs. interest
      </h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The composition of your payments over the life of the loan.
      </p>
    </div>
  </div>
  <div class="w-full min-w-0" bind:clientWidth={chartWidth}>
    <StackedBarChart
      groupLabels={periods.map((period) => period.key)}
      groupDisplayLabels={displayLabels}
      {series}
      yLabel="Payment (USD)"
      formatY={(value) => compactCurrency.format(value)}
      height={360}
      slantedXLabels={resolution !== 'year' && showPeriodLabels}
      subAxisLabels={visibleYearGroups}
      separatorAfterGroupIndexes={yearGroups
        .slice(0, -1)
        .map((group) => group.toIndex)}
      {legendItems}
      legendAlign="center"
      hoverEnabled={tooltipsEnabled}
      onSegmentHover={(info) => {
        hovered = info && tooltipsEnabled ? { info, source: periods } : null;
      }}
      emptyMessage={paidInFull
        ? 'Paid in full — no loan payments are needed.'
        : 'Enter valid loan assumptions to see the payment schedule.'}
    />
  </div>
  <InfoNote>
    Fixed rate with monthly payments. Estimates exclude taxes, insurance, fees,
    and extra payments. Total loan payments exclude the down payment; figures
    are rounded for display.
  </InfoNote>
</Card>
