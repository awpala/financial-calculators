<!--
@component
Lists evaluated named bindings with their declaration lines and full numeric values. Reads the route-owned calculator without changing or persisting it.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import type { CalculatorStore } from '#lib/calculator/calculator.svelte.js';
  import { formatCalculatedValue } from '#lib/calculator/presentation/format.js';
  /** Source and evaluated bindings owned by the route. */
  type Props = {
    /** Calculator supplying the evaluated bindings and their parsed declarations. */
    calculator: CalculatorStore;
  };
  let { calculator }: Props = $props();
  const result = $derived(calculator.calculation);
  const declarationLines = $derived(
    calculator.parsed.status === 'valid'
      ? new Map(
          calculator.parsed.program.assignments.map(({ name, line }) => [
            name,
            line,
          ]),
        )
      : new Map<string, number>(),
  );
</script>

<Card as="section" class="min-w-0 overflow-hidden" aria-label="Named bindings">
  <div
    class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"
  >
    <h2 class="text-base font-semibold">Named bindings</h2>
    <span class="text-xs text-slate-500 dark:text-slate-400"
      >{result?.bindings.length ?? 0} defined</span
    >
  </div>
  {#if result && result.bindings.length > 0}
    <div class="max-h-128 overflow-auto">
      <table aria-label="Variables" class="w-full text-sm">
        <thead
          class="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400"
        >
          <tr
            ><th scope="col" class="px-5 py-3 text-left font-medium">Name</th
            ><th scope="col" class="px-2 py-3 text-center font-medium">Line</th
            ><th scope="col" class="px-5 py-3 text-right font-medium">Value</th
            ></tr
          >
        </thead>
        <tbody
          class="divide-y divide-slate-100 font-mono dark:divide-slate-800"
        >
          {#each result.bindings as binding (binding.name)}
            <tr>
              <th
                scope="row"
                class="max-w-48 px-5 py-3 text-left font-normal break-words text-sky-700 dark:text-sky-300"
                >{binding.name}</th
              >
              <td
                class="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400"
                >{declarationLines.get(binding.name)}</td
              >
              <td
                class={[
                  'px-5 py-3 text-right font-medium break-all select-all',
                  !Number.isFinite(binding.value) &&
                    'text-amber-700 dark:text-amber-400',
                ]}
                >{Number.isFinite(binding.value)
                  ? formatCalculatedValue(binding.value)
                  : 'Undefined'}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div
      class="space-y-2 p-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
    >
      <p>Keep track of the figures in your calculation.</p>
      <p>
        <code class="font-mono text-sky-700 dark:text-sky-300"
          >rent = $1,850;</code
        > gives a figure a name you can reuse.
      </p>
    </div>
  {/if}
</Card>
