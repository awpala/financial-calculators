<!--
@component
Displays the last successful result or calculation error and the magnitude-suffix control. The route-owned calculator persists the display preference and explicit evaluations.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import Switch from '#lib/components/elements/Switch.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import CalculatorNotice from '#lib/components/views/scratchpad/CalculatorNotice.svelte';
  import type { CalculatorStore } from '#lib/calculator/calculator.svelte.js';
  import {
    formatCalculatedValue,
    formatSuffixedValue,
  } from '#lib/calculator/presentation/format.js';
  /** Route-owned calculation and presentation preference. */
  type Props = {
    /** Calculator whose result, errors, and suffix setting this card presents. */
    calculator: CalculatorStore;
  };
  let { calculator }: Props = $props();
  const result = $derived(calculator.calculation);
</script>

<Card as="section" class="space-y-5 p-5 sm:p-6" aria-label="Calculation result">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-base font-semibold">Result</h2>
    <HoverText
      text="Abbreviate the result to the largest magnitude that fits: 2,500,000 reads as 2.5M. Named bindings keep their full figures."
      align="end"
      wrapperClass="relative flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
    >
      <span>Suffixed</span>
      <Switch
        label="Show result with a magnitude suffix"
        checked={calculator.suffixed}
        onChange={(next) => calculator.setSuffixed(next)}
      />
    </HoverText>
  </div>
  <div aria-live="polite" aria-atomic="true">
    {#if calculator.calculationError}
      <CalculatorNotice
        lead="Cannot calculate"
        message={calculator.calculationError}
      />
    {:else if result?.value !== undefined}
      <output
        class={[
          'block font-mono text-3xl leading-relaxed font-semibold break-all select-all sm:text-4xl',
          Number.isFinite(result.value)
            ? 'text-slate-900 dark:text-slate-50'
            : 'text-amber-700 dark:text-amber-400',
        ]}
      >
        {Number.isFinite(result.value)
          ? calculator.suffixed
            ? formatSuffixedValue(result.value)
            : formatCalculatedValue(result.value)
          : 'Undefined'}
      </output>
    {:else}
      <p
        class="py-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
      >
        {result
          ? 'Bindings calculated. Add a final expression to produce a result.'
          : 'Your result will appear here after you calculate.'}
      </p>
    {/if}
  </div>
</Card>
