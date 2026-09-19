<!--
@component
Edits caller-owned take-home assumptions for the calculator or its Reset preset. Both uses share income conversion, number notation, and field styling.
-->
<script lang="ts">
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import TextField from '#lib/components/elements/TextField.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import {
    changeCashflowIncomeMode,
    type CashflowInputs,
  } from '#lib/cashflow/income.js';
  /** Editable assumptions and optional focus identity owned by the parent. */
  type Props = {
    /** Required mutable draft; the owner binds value and owns persistence. */
    value: CashflowInputs;
    /** Optional ID used by the owner's Clear action to focus gross income. */
    incomeId?: string;
  };
  let { value = $bindable(), incomeId }: Props = $props();
  const converted = $derived(
    changeCashflowIncomeMode(value, !value.useHourlyIncome),
  );
</script>

<div class="flex justify-end">
  <HoverText
    text="Convert between annual salary and hourly pay using your hours per week and weeks worked."
  >
    <OptionSwitch
      firstLabel="Annual"
      secondLabel="Hourly"
      checked={value.useHourlyIncome}
      label="Use hourly income"
      disabled={converted === null}
      onChange={() => {
        if (converted) value = converted;
      }}
    />
  </HoverText>
</div>
<div class="grid min-w-0 gap-5 sm:grid-cols-2">
  <TextField
    id={incomeId}
    label={value.useHourlyIncome
      ? 'Hourly income (USD)'
      : 'Annual income (USD)'}
    bind:value={value.income}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <TextField
    label="Effective tax rate (%)"
    bind:value={value.effectiveTaxRate}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <TextField
    label="Annual retirement contributions (USD)"
    bind:value={value.retirementContribution}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <TextField
    label="Other annual deductions (USD)"
    bind:value={value.annualDeductions}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
</div>
{#if value.useHourlyIncome}
  <fieldset
    class="min-w-0 space-y-4 rounded-md border border-slate-200 p-4 dark:border-slate-700"
  >
    <legend
      class="px-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
      >Hourly assumptions</legend
    >
    <div class="grid gap-5 sm:grid-cols-2">
      <TextField
        label="Hours per week"
        bind:value={value.hoursPerWeek}
        inputmode="text"
        autocomplete="off"
        inputClass="dark:bg-slate-950"
      />
      <TextField
        label="Weeks worked per year"
        bind:value={value.weeksWorked}
        inputmode="text"
        autocomplete="off"
        inputClass="dark:bg-slate-950"
      />
    </div>
  </fieldset>
{/if}
{#if converted === null}<p
    role="status"
    class="text-sm text-amber-700 dark:text-amber-400"
  >
    Reduce the income or work-hour assumptions before changing income mode.
  </p>{/if}
<InfoNote
  >Numbers accept $ signs, digit separators, and k/m/b/t suffixes, such as $125k
  or 1_250. Enter the tax rate as percentage points, such as 24.</InfoNote
>
