<!--
@component
Displays the calculated payment for the selected payment period and loan totals, using placeholders when the route has no valid calculation.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  import {
    getResolutionPayment,
    getResolutionPaymentLabel,
    type Amortization,
    type Resolution,
  } from '#lib/amortization/schedule.js';
  /** Calculated loan data owned by the route. */
  type Props = {
    /** Valid loan calculation, or undefined while inputs are incomplete/invalid. */
    loan?: Amortization;
    /** Payment period grouping, shared with the chart and table via the options rail. */
    resolution: Resolution;
  };
  let { loan, resolution }: Props = $props();
</script>

<Card as="section" class="p-5 sm:p-6" aria-label="Loan summary">
  <h2 class="text-sm font-medium text-slate-600 dark:text-slate-400">
    {getResolutionPaymentLabel(resolution)}
  </h2>
  <output
    class="mt-2 block text-4xl font-semibold tracking-tight break-all tabular-nums sm:text-5xl"
    aria-live="polite"
    >{loan ? money(getResolutionPayment(loan, resolution)) : '—'}</output
  >
  <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
    Principal & interest
  </p>
  <dl
    class="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-5 dark:border-slate-800"
  >
    <div>
      <dt class="text-xs text-slate-500 dark:text-slate-400">Loan amount</dt>
      <dd class="mt-1 text-lg font-medium break-all tabular-nums">
        {loan ? money(loan.principal) : '—'}
      </dd>
    </div>
    <div>
      <dt class="text-xs text-slate-500 dark:text-slate-400">Down payment</dt>
      <dd class="mt-1 text-lg font-medium break-all tabular-nums">
        {loan ? money(loan.downPayment) : '—'}
      </dd>
    </div>
    <div>
      <dt class="text-xs text-slate-500 dark:text-slate-400">Total interest</dt>
      <dd class="mt-1 text-lg font-medium break-all tabular-nums">
        {loan ? money(loan.totalInterest) : '—'}
      </dd>
    </div>
    <div>
      <dt class="text-xs text-slate-500 dark:text-slate-400">
        Total loan payments
      </dt>
      <dd class="mt-1 text-lg font-medium break-all tabular-nums">
        {loan ? money(loan.totalPaid) : '—'}
      </dd>
    </div>
  </dl>
</Card>
