<!--
@component
Edits caller-owned take-home assumptions for the calculator or its Reset preset. Both uses share income conversion, number notation, and field styling.
-->
<script lang="ts">
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import InvalidFieldsNote, {
    invalidFieldAttributes,
  } from '#lib/components/elements/InvalidFieldsNote.svelte';
  import TextField from '#lib/components/elements/TextField.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import {
    changeCashflowIncomeMode,
    invalidCashflowFields,
    type CashflowAmountField,
    type CashflowInputs,
  } from '#lib/cashflow/income.js';
  import {
    isClearInputsShortcut,
    isResetShortcut,
  } from '#lib/calculator/presentation/shortcuts.js';
  /** Editable assumptions and optional focus identity owned by the parent. */
  type Props = {
    /** Required mutable draft; the owner binds value and owns persistence. */
    value: CashflowInputs;
    /** Optional ID used by the owner's Clear action to focus gross income. */
    incomeId?: string;
    /** Caller-owned action reached by Ctrl+L while a field has focus. */
    onClear?: () => void;
    /** Caller-owned action reached by Shift+D while a field has focus. */
    onReset?: () => void;
  };
  let { value = $bindable(), incomeId, onClear, onReset }: Props = $props();

  function handleKeyDown(event: KeyboardEvent): void {
    if (onClear && isClearInputsShortcut(event)) {
      event.preventDefault();
      onClear();
    } else if (onReset && isResetShortcut(event)) {
      event.preventDefault();
      onReset();
    }
  }
  const converted = $derived(
    changeCashflowIncomeMode(value, !value.useHourlyIncome),
  );
  const uid = $props.id();
  const warningId = `${uid}-invalid`;
  const labels = $derived<Record<CashflowAmountField, string>>({
    income: value.useHourlyIncome
      ? 'Hourly income (USD)'
      : 'Annual income (USD)',
    effectiveTaxRate: 'Effective tax rate (%)',
    retirementContribution: 'Annual retirement contributions (USD)',
    annualDeductions: 'Other annual deductions (USD)',
    hoursPerWeek: 'Hours per week',
    weeksWorked: 'Weeks worked per year',
  });
  const invalid = $derived(invalidCashflowFields(value));
  const validity = (field: CashflowAmountField) =>
    invalidFieldAttributes(
      invalid.some((issue) => issue.field === field),
      warningId,
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
    label={labels.income}
    bind:value={value.income}
    {...validity('income')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
    onkeydown={handleKeyDown}
  />
  <TextField
    label={labels.effectiveTaxRate}
    bind:value={value.effectiveTaxRate}
    {...validity('effectiveTaxRate')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
    onkeydown={handleKeyDown}
  />
  <TextField
    label={labels.retirementContribution}
    bind:value={value.retirementContribution}
    {...validity('retirementContribution')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
    onkeydown={handleKeyDown}
  />
  <TextField
    label={labels.annualDeductions}
    bind:value={value.annualDeductions}
    {...validity('annualDeductions')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
    onkeydown={handleKeyDown}
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
        label={labels.hoursPerWeek}
        bind:value={value.hoursPerWeek}
        {...validity('hoursPerWeek')}
        inputmode="text"
        autocomplete="off"
        inputClass="dark:bg-slate-950"
        onkeydown={handleKeyDown}
      />
      <TextField
        label={labels.weeksWorked}
        bind:value={value.weeksWorked}
        {...validity('weeksWorked')}
        inputmode="text"
        autocomplete="off"
        inputClass="dark:bg-slate-950"
        onkeydown={handleKeyDown}
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
{#if invalid.length > 0}<InvalidFieldsNote
    id={warningId}
    issues={invalid.map(({ field, problem }) => ({
      label: labels[field],
      problem,
    }))}
    consequence="Until corrected, invalid values count as zero in the red figures."
  />{/if}
<InfoNote
  >Numbers accept $ signs, digit separators, and k/m/b/t suffixes, such as $125k
  or 1_250. Enter the tax rate as percentage points from 0 to 100, such as 24,
  without a suffix.</InfoNote
>
