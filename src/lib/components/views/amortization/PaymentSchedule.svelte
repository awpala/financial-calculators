<!--
@component
Renders grouped loan payments in a keyboard-scrollable table. The route supplies the same groups as the chart and owns all calculation state.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  import type {
    PaymentPeriod,
    Resolution,
  } from '#lib/amortization/schedule.js';
  /** Grouped payments and the meaning of an empty schedule. */
  type Props = {
    /** Route-owned rows shared with the payment chart. */
    periods: readonly PaymentPeriod[];
    /** Grouping used to describe the row count. */
    resolution: Resolution;
    /** Whether an empty schedule represents a fully paid purchase. */
    paidInFull: boolean;
  };
  let { periods, resolution, paidInFull }: Props = $props();
</script>

<Card
  as="section"
  class="min-w-0 overflow-hidden"
  aria-label="Amortization schedule"
>
  <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
    <h2 class="text-base font-semibold">Payment schedule</h2>
    <p class="text-xs text-slate-500 dark:text-slate-400">
      {periods.length}
      {resolution === 'year'
        ? 'years'
        : resolution === 'quarter'
          ? 'quarters'
          : 'months'}
    </p>
  </div>
  <!-- The schedule must support keyboard scrolling in both directions. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="max-h-96 overflow-auto"
    role="region"
    aria-label="Payment schedule table"
    tabindex="0"
  >
    <table class="w-full text-right text-sm whitespace-nowrap tabular-nums">
      <thead
        class="sticky top-0 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        ><tr
          ><th scope="col" class="px-5 py-3 text-left">Period</th><th
            scope="col"
            class="px-5 py-3">Principal</th
          ><th scope="col" class="px-5 py-3">Interest</th><th
            scope="col"
            class="px-5 py-3">Total payment</th
          ><th scope="col" class="px-5 py-3">Balance</th></tr
        ></thead
      >
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        {#each periods as period (period.key)}
          <tr
            ><th scope="row" class="px-5 py-3 text-left font-medium"
              >{period.key}</th
            ><td class="px-5 py-3">{money(period.principal)}</td><td
              class="px-5 py-3">{money(period.interest)}</td
            ><td class="px-5 py-3"
              >{money(period.principal + period.interest)}</td
            ><td class="px-5 py-3">{money(period.balance)}</td></tr
          >
        {:else}
          <tr
            ><td
              colspan="5"
              class="px-5 py-8 text-center text-slate-500 dark:text-slate-400"
              >{paidInFull
                ? 'No balance to repay.'
                : 'Complete the loan assumptions to see the schedule.'}</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</Card>
