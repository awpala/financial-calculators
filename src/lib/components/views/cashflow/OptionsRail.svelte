<!--
@component
Presents the shared chart-hover preference, the Cashflow display period that every figure on the page follows, and the assumptions behind those figures, in the order Amortization's rail uses. The route owns those values, their persistence, and contextual-rail registration.
-->
<script lang="ts">
  import RailPanel from '#lib/components/layout/RailPanel.svelte';
  import ChartHoverToggle from '#lib/components/charts/ChartHoverToggle.svelte';
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  /** Route-owned selections exposed by this rail. */
  type Props = {
    /** Whether figures read as monthly averages rather than annual totals. */
    monthlyBalance: boolean;
    /** Persists a change to the route-owned display period. */
    onPeriodChange: (monthly: boolean) => void;
    /** Whether the income breakdown responds to slice hover. */
    tooltipsEnabled: boolean;
    /** Persists a change to the route-owned chart-hover preference. */
    onTooltipsChange: (enabled: boolean) => void;
  };
  let {
    monthlyBalance,
    onPeriodChange,
    tooltipsEnabled,
    onTooltipsChange,
  }: Props = $props();
</script>

<RailPanel title="Cashflow">
  <ChartHoverToggle
    enabled={tooltipsEnabled}
    onChange={onTooltipsChange}
    description="Hovering a slice shows that amount and its share of gross income."
  />
  <section class="mt-6 w-64 max-w-full space-y-3" aria-label="Display period">
    <h3 class="text-xs font-semibold text-slate-600 dark:text-slate-400">
      Display period
    </h3>
    <OptionSwitch
      firstLabel="Annual"
      secondLabel="Monthly"
      checked={monthlyBalance}
      label="Show monthly figures"
      onChange={onPeriodChange}
    />
    <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      Chooses the period for the headline net income, the balance sheet, and the
      amounts behind the income breakdown. Monthly divides each annual figure by
      twelve, so shares of gross income do not change.
    </p>
  </section>
  <section class="mt-6 w-64 max-w-full space-y-3" aria-label="Assumptions">
    <h3 class="text-xs font-semibold text-slate-600 dark:text-slate-400">
      Assumptions
    </h3>
    <InfoNote>
      Empty, invalid, or negative values count as zero; invalid values are
      flagged. The tax rate must be from 0 to 100%, and net income has a floor
      of zero. This estimate uses your effective rate; it does not calculate tax
      brackets or payroll rules. Taxes apply to gross income; retirement
      contributions and other deductions are subtracted afterward.
    </InfoNote>
  </section>
</RailPanel>
