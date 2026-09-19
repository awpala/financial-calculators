<!--
@component
Owns editable loan assumptions and the options rail, syncing its working copy through the root settings controller and composing the summary, chart, and schedule.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import InputCard from '#lib/components/elements/InputCard.svelte';
  import OptionsRail from '#lib/components/views/amortization/OptionsRail.svelte';
  import LoanSummary from '#lib/components/views/amortization/LoanSummary.svelte';
  import PaymentChart from '#lib/components/views/amortization/PaymentChart.svelte';
  import PaymentSchedule from '#lib/components/views/amortization/PaymentSchedule.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import { getShellContext } from '#lib/context/shell.js';
  import LoanFields from '#lib/components/views/amortization/LoanFields.svelte';
  import { getCalculatorSettings } from '#lib/settings/calculator-settings.svelte.js';
  import {
    calculateAmortization,
    DEFAULT_LOAN_INPUTS,
    groupPayments,
    type LoanInputs,
  } from '#lib/amortization/schedule.js';
  import { persisted, type Persisted } from '#lib/state/storage.svelte.js';
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';
  import {
    CLEAR_INPUTS_KEYSHORTCUTS,
    CLEAR_INPUTS_SHORTCUT_LABEL,
    isClearInputsShortcut,
    isResetShortcut,
    RESET_KEYSHORTCUTS,
    RESET_SHORTCUT_LABEL,
  } from '#lib/calculator/presentation/shortcuts.js';

  let inputs = $state<LoanInputs>({ ...DEFAULT_LOAN_INPUTS });
  const shell = getShellContext();
  const settings = getCalculatorSettings();
  let tooltipStorage: Persisted<unknown> | undefined;
  let tooltipsEnabled = $state(true);
  let restored = $state(false);
  onMount(() => {
    tooltipStorage = persisted<unknown>('amortization_tooltips_v1', true);
    tooltipsEnabled = tooltipStorage.value !== false;
    inputs = settings.amortizationInputs;
    restored = true;
    return shell.registerContextualRail({
      label: 'amortization options',
      content: optionsRail,
    });
  });
  $effect(() => {
    if (restored) settings.amortizationInputs = { ...inputs };
  });

  const calculated = $derived(calculateAmortization(inputs));
  const loan = $derived(calculated.ok ? calculated.loan : undefined);
  const periods = $derived(
    groupPayments(loan?.payments ?? [], inputs.resolution),
  );
  const uid = $props.id();
  const purchasePriceId = `${uid}-purchase-price`;

  function clearInputs(): void {
    inputs = {
      ...inputs,
      purchasePrice: '',
      downPayment: '',
      years: '',
      annualRate: '',
    };
    document.getElementById(purchasePriceId)?.focus();
  }

  function resetInputs(): void {
    inputs = settings.amortizationDefaults;
  }

  function setTooltipsEnabled(enabled: boolean): void {
    tooltipsEnabled = enabled;
    if (tooltipStorage) tooltipStorage.value = enabled;
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
  <OptionsRail
    bind:resolution={inputs.resolution}
    {tooltipsEnabled}
    onTooltipsChange={setTooltipsEnabled}
  />
{/snippet}

<svelte:head>
  <title>Amortization · Financial Calculators</title>
  <meta
    name="description"
    content="Estimate monthly loan payments and explore principal and interest by year, quarter, or month."
  />
</svelte:head>

<PageContainer class="gap-6 pb-6">
  <PageHeader
    title="Amortization"
    description="See what you’ll pay each month, and how each payment pays down your loan."
    align="start"
  />

  <div
    class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
  >
    <InputCard
      title="Loan assumptions"
      clearDescription="Empty all four loan values. Keep the down-payment mode and chart grouping."
      resetDescription="Restore your saved Amortization defaults, including the payment-period grouping. Edit defaults in Settings."
      onClear={clearInputs}
      onReset={resetInputs}
      error={calculated.ok ? undefined : calculated.message}
      clearShortcutLabel={CLEAR_INPUTS_SHORTCUT_LABEL}
      clearKeyShortcuts={CLEAR_INPUTS_KEYSHORTCUTS}
      resetShortcutLabel={RESET_SHORTCUT_LABEL}
      resetKeyShortcuts={RESET_KEYSHORTCUTS}
    >
      <LoanFields
        bind:value={inputs}
        {purchasePriceId}
        onClear={clearInputs}
        onReset={resetInputs}
      />
    </InputCard>
    <LoanSummary {loan} resolution={inputs.resolution} />
  </div>

  <PaymentChart
    {periods}
    resolution={inputs.resolution}
    paidInFull={loan?.principal === 0}
    {tooltipsEnabled}
  />
  <PaymentSchedule
    {periods}
    resolution={inputs.resolution}
    paidInFull={loan?.principal === 0}
  />
</PageContainer>
