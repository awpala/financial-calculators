<!--
@component
Shows the headline take-home estimate for the route's selected display period. Calculation, period selection, and input state belong to the route.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import { formatCurrencyUSD as money } from '#lib/text/format.js';
  /** Net income for the period the route currently displays. */
  type Props = {
    /** Net income already divided for the selected period, or undefined when the calculation cannot produce a finite value. */
    value?: number;
    /** True labels the figure as monthly; false labels it as annual. */
    monthly: boolean;
    /** Whether the estimate reads unparseable input as zero, shown as an error. Defaults to false. */
    invalid?: boolean;
  };
  let { value, monthly, invalid = false }: Props = $props();
  const period = $derived(monthly ? 'Monthly' : 'Annual');
</script>

<Card
  as="section"
  class="space-y-3 p-5 sm:p-6"
  aria-label={`${period} take-home pay`}
>
  <h2 class="text-sm font-medium text-slate-600 dark:text-slate-400">
    {period} net income
  </h2>
  <output
    aria-live="polite"
    class={[
      'block text-4xl font-semibold tracking-tight break-all tabular-nums sm:text-5xl',
      invalid
        ? 'text-red-700 dark:text-red-400'
        : 'text-emerald-700 dark:text-emerald-400',
    ]}>{value !== undefined ? money(value) : '—'}</output
  >
  <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
    After estimated taxes, retirement contributions, and other deductions{monthly
      ? ', averaged over 12 months'
      : ''}.
  </p>
</Card>
