<!--
@component
Shows the monthly take-home estimate independently of the balance sheet’s selected period. Calculation and input state belong to the route.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  /** Monthly output from the route's income calculation. */
  type Props = {
    /** Monthly net income, or undefined when the calculation cannot produce a finite value. */
    value?: number;
  };
  let { value }: Props = $props();
</script>

<Card
  as="section"
  class="space-y-3 p-5 sm:p-6"
  aria-label="Monthly take-home pay"
>
  <h2 class="text-sm font-medium text-slate-600 dark:text-slate-400">
    Monthly net income
  </h2>
  <output
    aria-live="polite"
    class="block text-4xl font-semibold tracking-tight break-all text-emerald-700 tabular-nums sm:text-5xl dark:text-emerald-400"
    >{value !== undefined ? money(value) : '—'}</output
  >
  <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
    After estimated taxes, retirement contributions, and other deductions,
    averaged over 12 months.
  </p>
</Card>
