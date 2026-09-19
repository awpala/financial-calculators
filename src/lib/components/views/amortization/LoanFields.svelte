<!--
@component
Edits caller-owned loan assumptions for the calculator or its saved Reset preset. Mode changes preserve the down payment's monetary value.
-->
<script lang="ts">
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import TextField from '#lib/components/elements/TextField.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  import {
    parseLoanNumber,
    type LoanInputs,
  } from '#lib/amortization/schedule.js';
  import { formatNumberInput } from '#lib/calculator/presentation/number-input.js';
  /** Editable assumptions and optional focus identity owned by the parent. */
  type Props = {
    /** Required mutable draft; the owner binds value and owns persistence. */
    value: LoanInputs;
    /** Optional ID used by the owner's Clear action to focus the purchase price. */
    purchasePriceId?: string;
  };
  let { value = $bindable(), purchasePriceId }: Props = $props();
  const price = $derived(parseLoanNumber(value.purchasePrice));
  const down = $derived(parseLoanNumber(value.downPayment));
  const converted = $derived(
    value.downPaymentPercent ? (down / 100) * price : (down / price) * 100,
  );
  const canConvert = $derived(
    Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(down) &&
      Number.isFinite(converted),
  );
</script>

<div class="grid min-w-0 gap-5 sm:grid-cols-2">
  <TextField
    id={purchasePriceId}
    label="Purchase price (USD)"
    bind:value={value.purchasePrice}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <div class="min-w-0 space-y-2">
    <TextField
      label={value.downPaymentPercent
        ? 'Down payment (%)'
        : 'Down payment (USD)'}
      bind:value={value.downPayment}
      inputmode="text"
      autocomplete="off"
      inputClass="dark:bg-slate-950"
    />
    <div class="flex justify-end">
      <OptionSwitch
        firstLabel="Amount"
        secondLabel="Percentage"
        checked={value.downPaymentPercent}
        label="Use a percentage down payment"
        disabled={!canConvert}
        onChange={(percent) => {
          if (canConvert)
            value = {
              ...value,
              downPaymentPercent: percent,
              downPayment: formatNumberInput(converted),
            };
        }}
      />
    </div>
  </div>
  <TextField
    label="Loan term (years)"
    bind:value={value.years}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <TextField
    label="Annual interest rate (%)"
    bind:value={value.annualRate}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
</div>
<InfoNote
  >Numbers accept $ signs, digit separators, and k/m/b/t suffixes, such as $125k
  or 1_250. Enter rates as percentage points, such as 6.5.</InfoNote
>
