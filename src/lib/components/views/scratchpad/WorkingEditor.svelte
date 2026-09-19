<!--
@component
Presents Scratchpad source editing, live highlighting, input diagnostics, and calculation controls. The route owns the calculator and clear/focus policy; textarea shortcuts stay with this editor.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import Button from '#lib/components/elements/Button.svelte';
  import KeypressPrompt from '#lib/components/elements/KeypressPrompt.svelte';
  import TextAreaField, {
    type TextAreaSegmentTone,
  } from '#lib/components/elements/TextAreaField.svelte';
  import CalculatorNotice from '#lib/components/views/scratchpad/CalculatorNotice.svelte';
  import type { CalculatorStore } from '#lib/calculator/calculator.svelte.js';
  import {
    highlightInput,
    type SourceTone,
  } from '#lib/calculator/presentation/highlight.js';
  import {
    CALCULATE_SHORTCUT_LABEL,
    CLEAR_INPUTS_KEYSHORTCUTS,
    CLEAR_INPUTS_SHORTCUT_LABEL,
    isCalculateShortcut,
    isClearInputsShortcut,
  } from '#lib/calculator/presentation/shortcuts.js';
  /** Route-owned working state and editor focus identity. */
  type Props = {
    /** Calculator instance whose source is edited and explicitly evaluated here. */
    calculator: CalculatorStore;
    /** Stable textarea identity used by the route's clear and example actions. */
    inputId: string;
    /** Clears source through the controller and returns focus to the editor. */
    onClear: () => void;
  };
  let { calculator, inputId, onClear }: Props = $props();
  const tones = {
    comment: 'muted',
    constant: 'accent-constant',
    variable: 'accent',
    operator: 'accent-alt',
  } as const satisfies Record<SourceTone, TextAreaSegmentTone>;
  const segments = $derived(
    highlightInput(calculator.source).map(({ text, tone }) => ({
      text,
      tone: tone && tones[tone],
    })),
  );
  const example =
    '# Monthly budget\nincome = $6,500;\nhousing = $1,850;\nother expenses = $2.2k;\nsavings = income - housing - other expenses;\nsavings * 12';

  function handleKeyDown(event: KeyboardEvent): void {
    if (isCalculateShortcut(event)) {
      event.preventDefault();
      calculator.calculate();
    } else if (isClearInputsShortcut(event)) {
      event.preventDefault();
      onClear();
    }
  }
</script>

<Card
  as="section"
  class="min-w-0 space-y-5 p-4 sm:p-6"
  aria-label="Calculation editor"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-base font-semibold">Your working</h2>
  </div>
  <TextAreaField
    label="Input"
    id={inputId}
    bind:value={calculator.source}
    rows={7}
    spellcheck={false}
    autocomplete="off"
    autocapitalize="off"
    placeholder={example}
    onkeydown={handleKeyDown}
    {segments}
    lineNumbers
    textClass="font-mono leading-7"
    inputClass="h-52 min-h-40 resize-y dark:bg-slate-950"
    aria-describedby={`${inputId}-syntax`}
    aria-invalid={calculator.parsed.status === 'invalid'}
  />
  {#if calculator.parsed.status === 'invalid'}
    <CalculatorNotice
      lead="Invalid input"
      message={calculator.parsed.message}
    />
  {/if}
  <div class="flex flex-wrap items-center justify-end gap-3">
    {#if calculator.source === ''}
      <Button
        variant="secondary"
        onclick={() => {
          calculator.source = example;
          document.getElementById(inputId)?.focus();
        }}>Try an example</Button
      >
    {/if}
    <Button
      variant="secondary"
      disabled={calculator.source === ''}
      onclick={onClear}
      aria-keyshortcuts={CLEAR_INPUTS_KEYSHORTCUTS}
    >
      <span class="flex items-center gap-3"
        >Clear Inputs <KeypressPrompt key={CLEAR_INPUTS_SHORTCUT_LABEL} /></span
      >
    </Button>
    <Button
      disabled={!calculator.canCalculate}
      onclick={() => calculator.calculate()}
      aria-keyshortcuts="Shift+Enter"
    >
      <span class="flex items-center gap-3"
        >Calculate <KeypressPrompt
          key={CALCULATE_SHORTCUT_LABEL}
          tone="inverted"
        /></span
      >
    </Button>
  </div>
  <p
    id={`${inputId}-syntax`}
    class="text-xs leading-relaxed text-slate-500 dark:text-slate-400"
  >
    Separate declarations with semicolons. End with an expression for a result.
    Enter starts a new line; Shift Enter calculates.
  </p>
</Card>
