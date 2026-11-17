<!--
@component
Owns a full-page Scratchpad, restoring browser-local work on mount and presenting its source beside the result and bindings.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import WorkingEditor from '#lib/components/views/scratchpad/WorkingEditor.svelte';
  import CalculationResult from '#lib/components/views/scratchpad/CalculationResult.svelte';
  import NamedBindings from '#lib/components/views/scratchpad/NamedBindings.svelte';
  import SyntaxReference from '#lib/components/views/scratchpad/SyntaxReference.svelte';
  import { CalculatorStore } from '#lib/calculator/calculator.svelte.js';
  import {
    isCalculateShortcut,
    isClearInputsShortcut,
  } from '#lib/calculator/presentation/shortcuts.js';
  import {
    CALCULATOR_BINDINGS_SORT_STORAGE_KEY,
    CALCULATOR_INPUT_STORAGE_KEY,
    CALCULATOR_RESULT_STORAGE_KEY,
    CALCULATOR_SUFFIXED_STORAGE_KEY,
    CALCULATOR_SYNTAX_EXPANDED_STORAGE_KEY,
    normalizeCalculatorBindingsSort,
    normalizeCalculatorFlag,
    type CalculatorBindingsSort,
  } from '#lib/calculator/persistence/preferences.js';
  import { persisted, type Persisted } from '#lib/state/storage.svelte.js';
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';

  const uid = $props.id();
  const inputId = `${uid}-input`;
  let calculator = $state.raw(
    new CalculatorStore({ suffixed: { value: false } }),
  );
  let syntaxExpanded = $state(false);
  let syntaxStorage: Persisted<unknown> | undefined;
  let bindingsSort = $state.raw(normalizeCalculatorBindingsSort(undefined));
  let bindingsSortStorage: Persisted<unknown> | undefined;

  onMount(() => {
    const restored = new CalculatorStore({
      suffixed: persisted<unknown>(CALCULATOR_SUFFIXED_STORAGE_KEY, false),
    });
    restored.adopt({
      input: persisted<unknown>(CALCULATOR_INPUT_STORAGE_KEY, ''),
      calculation: persisted<unknown>(CALCULATOR_RESULT_STORAGE_KEY, null),
    });
    calculator = restored;
    syntaxStorage = persisted<unknown>(
      CALCULATOR_SYNTAX_EXPANDED_STORAGE_KEY,
      false,
    );
    syntaxExpanded = normalizeCalculatorFlag(syntaxStorage.value);
    bindingsSortStorage = persisted<unknown>(
      CALCULATOR_BINDINGS_SORT_STORAGE_KEY,
      null,
    );
    bindingsSort = normalizeCalculatorBindingsSort(bindingsSortStorage.value);
  });

  function setSyntaxExpanded(expanded: boolean): void {
    syntaxExpanded = expanded;
    if (syntaxStorage) syntaxStorage.value = expanded;
  }

  function setBindingsSort(sort: CalculatorBindingsSort): void {
    bindingsSort = sort;
    if (bindingsSortStorage) bindingsSortStorage.value = sort;
  }

  function clearInputs(): void {
    calculator.clear();
    document.getElementById(inputId)?.focus();
  }

  function runExample(source: string): void {
    calculator.source = source;
    calculator.calculate();
    const input = document.getElementById(inputId);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: 'center' });
  }

  useKeyboard((event) => {
    if (isCalculateShortcut(event)) {
      event.preventDefault();
      calculator.calculate();
    } else if (isClearInputsShortcut(event)) {
      event.preventDefault();
      clearInputs();
    }
  });
</script>

<svelte:head>
  <title>Scratchpad · Financial Calculators</title>
  <meta
    name="description"
    content="A scratch calculator with named bindings, highlighted expressions, and room to work through the numbers."
  />
</svelte:head>

<PageContainer class="gap-6 pb-6">
  <PageHeader
    title="Scratchpad"
    description="Name your figures, write the working, and calculate when you’re ready."
    align="start"
  />

  <div
    class="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
  >
    <WorkingEditor {calculator} {inputId} onClear={clearInputs} />
    <div class="min-w-0 space-y-6">
      <CalculationResult {calculator} />
      <NamedBindings
        {calculator}
        sort={bindingsSort}
        onSortChange={setBindingsSort}
      />
    </div>
  </div>
  <SyntaxReference
    expanded={syntaxExpanded}
    onExpandedChange={setSyntaxExpanded}
    onRun={runExample}
  />
</PageContainer>
