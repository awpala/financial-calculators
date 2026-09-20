<!--
@component
Owns Cashflow editing, its persisted display period, and the contextual rail that selects it, syncing working inputs through the root settings controller and composing take-home pay with annual or monthly line items and their shares of gross income.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import InputCard from '#lib/components/elements/InputCard.svelte';
  import NetIncomeSummary from '#lib/components/views/cashflow/NetIncomeSummary.svelte';
  import BalanceSheet from '#lib/components/views/cashflow/BalanceSheet.svelte';
  import IncomeBreakdown from '#lib/components/views/cashflow/IncomeBreakdown.svelte';
  import OptionsRail from '#lib/components/views/cashflow/OptionsRail.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import IncomeFields from '#lib/components/views/cashflow/IncomeFields.svelte';
  import { getShellContext } from '#lib/context/shell.js';
  import { getCalculatorSettings } from '#lib/settings/calculator-settings.svelte.js';
  import { persisted, type Persisted } from '#lib/state/storage.svelte.js';
  import {
    calculateCashflow,
    DEFAULT_CASHFLOW_INPUTS,
    invalidCashflowFields,
    type CashflowInputs,
  } from '#lib/cashflow/income.js';
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';
  import {
    CLEAR_INPUTS_KEYSHORTCUTS,
    CLEAR_INPUTS_SHORTCUT_LABEL,
    isClearInputsShortcut,
    isResetShortcut,
    RESET_KEYSHORTCUTS,
    RESET_SHORTCUT_LABEL,
  } from '#lib/calculator/presentation/shortcuts.js';

  const uid = $props.id();
  const incomeId = `${uid}-income`;
  let inputs = $state<CashflowInputs>({ ...DEFAULT_CASHFLOW_INPUTS });
  const settings = getCalculatorSettings();
  const shell = getShellContext();
  let restored = $state(false);
  let monthlyBalance = $state(false);
  let balanceStorage: Persisted<unknown> | undefined;

  onMount(() => {
    inputs = settings.cashflowInputs;
    balanceStorage = persisted<unknown>('cashflow_monthly_balance_v1', false);
    monthlyBalance = balanceStorage.value === true;
    restored = true;
    return shell.registerContextualRail({
      label: 'Cashflow Options',
      content: optionsRail,
    });
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

  function resetInputs(): void {
    inputs = settings.cashflowDefaults;
  }

  function setMonthlyBalance(monthly: boolean): void {
    monthlyBalance = monthly;
    if (balanceStorage) balanceStorage.value = monthly;
  }

  useKeyboard((event) => {
    if (isClearInputsShortcut(event)) {
      event.preventDefault();
      clearInputs();
    } else if (isResetShortcut(event)) {
      event.preventDefault();
      resetInputs();
    }
  });
</script>

{#snippet optionsRail()}
  <OptionsRail {monthlyBalance} onPeriodChange={setMonthlyBalance} />
{/snippet}

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
    description="Turn annual or hourly income into an annual or monthly take-home estimate."
    align="start"
  />

  <div
    class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
  >
    <div class="min-w-0 space-y-6">
      <InputCard
        title="Income assumptions"
        class="space-y-6"
        clearDescription="Empty all income, deduction, and work-hour values. Keep the selected income mode."
        resetDescription="Restore your saved Cashflow defaults, including income mode and work-hour assumptions. Edit defaults in Settings."
        onClear={clearInputs}
        onReset={resetInputs}
        error={calculated.ok ? undefined : calculated.message}
        clearShortcutLabel={CLEAR_INPUTS_SHORTCUT_LABEL}
        clearKeyShortcuts={CLEAR_INPUTS_KEYSHORTCUTS}
        resetShortcutLabel={RESET_SHORTCUT_LABEL}
        resetKeyShortcuts={RESET_KEYSHORTCUTS}
      >
        <IncomeFields
          bind:value={inputs}
          {incomeId}
          onClear={clearInputs}
          onReset={resetInputs}
        />
      </InputCard>
      <NetIncomeSummary
        value={monthlyBalance
          ? cashflow?.monthlyNetIncome
          : cashflow?.annualNetIncome}
        monthly={monthlyBalance}
        invalid={invalid.length > 0}
      />
    </div>
    <div class="min-w-0 space-y-6">
      <BalanceSheet {cashflow} {monthlyBalance} {invalid} />
      <IncomeBreakdown {cashflow} {monthlyBalance} {invalid} />
    </div>
  </div>
</PageContainer>
