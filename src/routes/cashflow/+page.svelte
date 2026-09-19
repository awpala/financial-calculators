<!--
@component
Owns Cashflow editing and its persisted balance-sheet period, syncing working inputs through the root settings controller and composing take-home pay with annual or monthly line items.
-->
<script lang="ts">
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import { onMount } from 'svelte';
  import InputCard from '#lib/components/elements/InputCard.svelte';
  import MonthlyIncome from '#lib/components/views/cashflow/MonthlyIncome.svelte';
  import BalanceSheet from '#lib/components/views/cashflow/BalanceSheet.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import IncomeFields from '#lib/components/views/cashflow/IncomeFields.svelte';
  import { getCalculatorSettings } from '#lib/settings/calculator-settings.svelte.js';
  import { persisted, type Persisted } from '#lib/state/storage.svelte.js';
  import {
    calculateCashflow,
    DEFAULT_CASHFLOW_INPUTS,
    invalidCashflowFields,
    type CashflowInputs,
  } from '#lib/cashflow/income.js';

  const uid = $props.id();
  const incomeId = `${uid}-income`;
  let inputs = $state<CashflowInputs>({ ...DEFAULT_CASHFLOW_INPUTS });
  const settings = getCalculatorSettings();
  let restored = $state(false);
  let monthlyBalance = $state(false);
  let balanceStorage: Persisted<unknown> | undefined;

  onMount(() => {
    inputs = settings.cashflowInputs;
    balanceStorage = persisted<unknown>('cashflow_monthly_balance_v1', false);
    monthlyBalance = balanceStorage.value === true;
    restored = true;
  });
  $effect(() => {
    if (restored) settings.cashflowInputs = { ...inputs };
  });

  const calculated = $derived(calculateCashflow(inputs));
  const cashflow = $derived(calculated.ok ? calculated.cashflow : undefined);
  const invalid = $derived(
    invalidCashflowFields(inputs).map((issue) => issue.field),
  );
  function clearInputs(): void {
    inputs = {
      useHourlyIncome: inputs.useHourlyIncome,
      income: '',
      hoursPerWeek: '',
      weeksWorked: '',
      effectiveTaxRate: '',
      retirementContribution: '',
      annualDeductions: '',
    };
    document.getElementById(incomeId)?.focus();
  }
</script>

<svelte:head>
  <title>Cashflow · Financial Calculators</title>
  <meta
    name="description"
    content="Estimate monthly take-home pay from annual or hourly income, taxes, retirement contributions, and other deductions."
  />
</svelte:head>

<PageContainer class="gap-6 pb-6">
  <PageHeader
    title="Cashflow"
    description="Turn annual or hourly income into a monthly take-home estimate."
    align="start"
  />

  <div
    class="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
  >
    <InputCard
      title="Income assumptions"
      class="space-y-6"
      clearDescription="Empty all income, deduction, and work-hour values. Keep the selected income mode."
      resetDescription="Restore your saved Cashflow defaults, including income mode and work-hour assumptions. Edit defaults in Settings."
      onClear={clearInputs}
      onReset={() => (inputs = settings.cashflowDefaults)}
      error={calculated.ok ? undefined : calculated.message}
    >
      <IncomeFields bind:value={inputs} {incomeId} />
    </InputCard>
    <div class="min-w-0 space-y-6">
      <MonthlyIncome
        value={cashflow?.monthlyNetIncome}
        invalid={invalid.length > 0}
      />
      <BalanceSheet
        {cashflow}
        {monthlyBalance}
        {invalid}
        onPeriodChange={(monthly) => {
          monthlyBalance = monthly;
          if (balanceStorage) balanceStorage.value = monthly;
        }}
      />
    </div>
  </div>

  <InfoNote class="mx-auto max-w-4xl">
    Empty, invalid, or negative values count as zero; invalid values are
    flagged. The tax rate must be from 0 to 100%, and net income has a floor of
    zero. This estimate uses your effective rate; it does not calculate tax
    brackets or payroll rules. Taxes apply to gross income; retirement
    contributions and other deductions are subtracted afterward.
  </InfoNote>
</PageContainer>
