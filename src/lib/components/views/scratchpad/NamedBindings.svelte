<!--
@component
Lists evaluated named bindings with their declaration lines and full numeric values. Reports column-sort changes to the route, which owns the saved preference and calculator.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import TriangleIcon from '#lib/icons/navigation/TriangleIcon.svelte';
  import type { CalculatorStore } from '#lib/calculator/calculator.svelte.js';
  import {
    formatCalculatorValue,
    isDefinedValue,
  } from '#lib/calculator/presentation/format.js';
  import type { CalculatorBindingsSort } from '#lib/calculator/persistence/preferences.js';
  /** Source, evaluated bindings, and sort preference owned by the route. */
  type Props = {
    /** Calculator supplying the evaluated bindings and their parsed declarations. */
    calculator: CalculatorStore;
    /** Current table sort, restored and persisted by the route. */
    sort: CalculatorBindingsSort;
    /** Reports the selected column and direction for the route to apply and save. */
    onSortChange: (sort: CalculatorBindingsSort) => void;
  };
  let { calculator, sort, onSortChange }: Props = $props();
  const columns = [
    {
      key: 'line',
      label: 'Line',
      class: 'px-2 py-3 text-center font-medium',
    },
    {
      key: 'name',
      label: 'Name',
      class: 'px-5 py-3 text-center font-medium',
    },
    {
      key: 'value',
      label: 'Value',
      class: 'px-5 py-3 text-right font-medium',
    },
  ] as const;
  const result = $derived(calculator.calculation);
  const canSort = $derived((result?.bindings.length ?? 0) > 1);
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
  const sortedBindings = $derived.by(() =>
    (result?.bindings ?? []).toSorted((left, right) => {
      let comparison: number;
      switch (sort.column) {
        case 'line':
          comparison =
            (declarationLines.get(left.name) ?? 0) -
            (declarationLines.get(right.name) ?? 0);
          break;
        case 'name':
          comparison = left.name.localeCompare(right.name, 'en-US');
          break;
        case 'value': {
          const rank = (value: typeof left.value) =>
            typeof value !== 'number' ? 1 : Number.isFinite(value) ? 0 : 2;
          const category = rank(left.value) - rank(right.value);
          // Arrays retain declaration order after finite scalars; undefined scalars stay last.
          if (category !== 0) return category;
          comparison =
            typeof left.value === 'number' &&
            typeof right.value === 'number' &&
            Number.isFinite(left.value) &&
            Number.isFinite(right.value)
              ? left.value - right.value
              : 0;
          break;
        }
      }
      return sort.direction === 'ascending' ? comparison : -comparison;
    }),
  );

  function sortBy(column: CalculatorBindingsSort['column']): void {
    onSortChange({
      column,
      direction:
        sort.column === column && sort.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    });
  }
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
  {#if result}
    <div class="flex max-h-128 justify-center overflow-auto">
      <table aria-label="Variables" class="text-sm">
        <thead
          class="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400"
        >
          <tr>
            {#each columns as column (column.key)}
              <th
                scope="col"
                class={column.class}
                aria-sort={canSort && sort.column === column.key
                  ? sort.direction
                  : undefined}
              >
                {#if canSort}
                  <button
                    type="button"
                    class="relative cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500"
                    title={`Sort by ${column.label} ${sort.column === column.key && sort.direction === 'ascending' ? 'descending' : 'ascending'}`}
                    onclick={() => sortBy(column.key)}
                  >
                    {column.label}
                    {#if sort.column === column.key}
                      <TriangleIcon
                        class={[
                          'absolute top-1/2 left-full ml-1 size-2.5 -translate-y-1/2',
                          sort.direction === 'descending' && 'rotate-180',
                        ]}
                      />
                    {/if}
                  </button>
                {:else}
                  {column.label}
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody
          class="divide-y divide-slate-100 font-mono dark:divide-slate-800"
        >
          {#each sortedBindings as binding (binding.name)}
            <tr>
              <td
                class="px-2 py-3 text-right text-xs text-slate-500 dark:text-slate-400"
                >{declarationLines.get(binding.name)}</td
              >
              <th
                scope="row"
                class="max-w-48 px-5 py-3 text-left font-normal wrap-break-word text-sky-700 dark:text-sky-300"
                >{binding.name}</th
              >
              <td
                class={[
                  'px-5 py-3 text-right font-medium break-all select-all',
                  !isDefinedValue(binding.value) &&
                    'text-amber-700 dark:text-amber-400',
                ]}>{formatCalculatorValue(binding.value)}</td
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
