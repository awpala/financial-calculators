<!--
@component
Composes the Cashflow Reset preset editor with its validation and fields. The shared editor owns its unsaved draft.
-->
<script lang="ts">
  import IncomeFields from '#lib/components/views/cashflow/IncomeFields.svelte';
  import PresetEditor from '#lib/components/views/settings/PresetEditor.svelte';
  import { DEFAULT_CASHFLOW_INPUTS } from '#lib/cashflow/income.js';
  import {
    getCalculatorSettings,
    cashflowDefaultsError,
  } from '#lib/settings/calculator-settings.svelte.js';
  const settings = getCalculatorSettings();
</script>

<svelte:head>
  <title>Cashflow settings · Financial Calculators</title>
  <meta
    name="description"
    content="Set the defaults restored by Cashflow’s Reset button."
  />
</svelte:head>

<PresetEditor
  name="Cashflow"
  initial={{ ...DEFAULT_CASHFLOW_INPUTS }}
  read={() => settings.cashflowDefaults}
  save={(value) => settings.saveCashflowDefaults(value)}
  validate={cashflowDefaultsError}
>
  {#snippet children(draft)}<IncomeFields bind:value={draft.value} />{/snippet}
</PresetEditor>
