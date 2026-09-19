<!--
@component
Edits caller-owned loan assumptions for the calculator or its saved Reset preset. Mode changes preserve the down payment's monetary value.
-->
<script lang="ts">
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import InvalidFieldsNote, {
    invalidFieldAttributes,
  } from '#lib/components/elements/InvalidFieldsNote.svelte';
  import TextField from '#lib/components/elements/TextField.svelte';
  import OptionSwitch from '#lib/components/elements/OptionSwitch.svelte';
  import {
    invalidLoanFields,
    parseDownPayment,
    parseLoanNumber,
    type LoanInputs,
    type LoanNumberField,
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
  const down = $derived(parseDownPayment(value));
  const converted = $derived(
    value.downPaymentPercent ? (down / 100) * price : (down / price) * 100,
  );
  const uid = $props.id();
  const warningId = `${uid}-invalid`;
  const labels = $derived<Record<LoanNumberField, string>>({
    purchasePrice: 'Purchase price (USD)',
    downPayment: value.downPaymentPercent
      ? 'Down payment (%)'
      : 'Down payment (USD)',
    years: 'Loan term (years)',
    annualRate: 'Annual interest rate (%)',
  });
  const invalid = $derived(invalidLoanFields(value));
  const validity = (field: LoanNumberField) =>
    invalidFieldAttributes(
      invalid.some((issue) => issue.field === field),
      warningId,
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
    label={labels.purchasePrice}
    bind:value={value.purchasePrice}
    {...validity('purchasePrice')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <div class="min-w-0 space-y-2">
    <TextField
      label={labels.downPayment}
      bind:value={value.downPayment}
      {...validity('downPayment')}
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
    label={labels.years}
    bind:value={value.years}
    {...validity('years')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
  <TextField
    label={labels.annualRate}
    bind:value={value.annualRate}
    {...validity('annualRate')}
    inputmode="text"
    autocomplete="off"
    inputClass="dark:bg-slate-950"
  />
</div>
{#if invalid.length > 0}<InvalidFieldsNote
    id={warningId}
    issues={invalid.map(({ field, problem }) => ({
      label: labels[field],
      problem,
    }))}
  />{/if}
<InfoNote
  >Numbers accept $ signs, digit separators, and k/m/b/t suffixes, such as $125k
  or 1_250. Enter percentages as points from 0 to 100, such as 6.5, without a
  suffix.</InfoNote
>
