<!--
@component
Composes the Amortization Reset preset editor with the loan model's validation and fields. The shared editor owns its unsaved draft.
-->
<script lang="ts">
  import SelectField from '#lib/components/elements/SelectField.svelte';
  import LoanFields from '#lib/components/views/amortization/LoanFields.svelte';
  import PresetEditor from '#lib/components/views/settings/PresetEditor.svelte';
  import {
    calculateAmortization,
    DEFAULT_LOAN_INPUTS,
    PAYMENT_RESOLUTIONS,
  } from '#lib/amortization/schedule.js';
  import { getCalculatorSettings } from '#lib/settings/calculator-settings.svelte.js';
  const settings = getCalculatorSettings();
</script>

<svelte:head>
  <title>Amortization settings · Financial Calculators</title>
  <meta
    name="description"
    content="Set the defaults restored by Amortization’s Reset button."
  />
</svelte:head>

<PresetEditor
  name="Amortization"
  initial={{ ...DEFAULT_LOAN_INPUTS }}
  read={() => settings.amortizationDefaults}
  save={(value) => settings.saveAmortizationDefaults(value)}
  validate={(value) => {
    const result = calculateAmortization(value);
    return result.ok ? undefined : result.message;
  }}
>
  {#snippet children(draft)}
    <LoanFields bind:value={draft.value} />
    <SelectField
      label="Payment period"
      options={PAYMENT_RESOLUTIONS}
      bind:value={draft.value.resolution}
      selectClass="bg-white dark:bg-slate-950"
    />
  {/snippet}
</PresetEditor>
