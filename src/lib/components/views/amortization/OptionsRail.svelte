<!--
@component
Presents Amortization tooltip and payment-period controls. The route owns their values, persistence, and contextual-rail registration.
-->
<script lang="ts">
  import RailPanel from '#lib/components/layout/RailPanel.svelte';
  import ChartHoverToggle from '#lib/components/charts/ChartHoverToggle.svelte';
  import {
    PAYMENT_RESOLUTIONS,
    type Resolution,
  } from '#lib/amortization/schedule.js';
  /** Route-owned selections exposed by this rail. */
  type Props = {
    /** Current chart/table grouping, bound to the route's working inputs. */
    resolution: Resolution;
    /** Whether hovering payment segments displays a tooltip. */
    tooltipsEnabled: boolean;
    /** Persists a change to the route-owned tooltip preference. */
    onTooltipsChange: (enabled: boolean) => void;
  };
  let {
    resolution = $bindable(),
    tooltipsEnabled,
    onTooltipsChange,
  }: Props = $props();
</script>

<RailPanel title="Amortization">
  <ChartHoverToggle
    enabled={tooltipsEnabled}
    onChange={onTooltipsChange}
    description="Hovering principal or interest shows that period and payment amount."
  />
  <div class="mt-6 space-y-2">
    <h2 class="text-xs font-semibold text-slate-600 dark:text-slate-400">
      Payment period
    </h2>
    <div
      class="mx-auto flex w-fit flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label="Payment period"
    >
      {#each PAYMENT_RESOLUTIONS as option (option.value)}
        <button
          type="button"
          aria-pressed={resolution === option.value}
          onclick={() => (resolution = option.value)}
          class={[
            'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-500',
            resolution === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          ]}>{option.label}</button
        >
      {/each}
    </div>
    <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      Groups both the chart and payment schedule.
    </p>
  </div>
</RailPanel>
