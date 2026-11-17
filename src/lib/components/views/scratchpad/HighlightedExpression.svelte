<!--
@component
Renders escaped calculator source with the same semantic highlighting as the Scratchpad editor, inline or as a wrapped example block.
-->
<script lang="ts">
  import {
    highlightInput,
    type SourceTone,
  } from '#lib/calculator/presentation/highlight.js';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import ClipboardIcon from '#lib/icons/actions/ClipboardIcon.svelte';

  /** Calculator source and its presentation in explanatory content. */
  type Props = {
    /** Source to display verbatim; it is highlighted without being evaluated. */
    source: string;
    /** Whether to frame a multiline example; defaults to inline code. */
    block?: boolean;
    /** Optional action for a complete block example; the route owns replacing input and calculating. */
    onRun?: (source: string) => void;
    /** Name identifying the example in the run button's accessible label; defaults to Example. */
    exampleName?: string;
  };

  let {
    source,
    block = false,
    onRun,
    exampleName = 'Example',
  }: Props = $props();
  const segments = $derived(highlightInput(source));
  const tones: Record<SourceTone, string> = {
    comment: 'text-slate-400 dark:text-slate-500',
    variable: 'text-sky-700 dark:text-sky-300',
    operator: 'text-violet-700 dark:text-violet-300',
    constant: 'text-emerald-700 dark:text-emerald-300',
    'bracket-1': 'text-amber-700 dark:text-amber-300',
    'bracket-2': 'text-rose-700 dark:text-rose-300',
    'bracket-3': 'text-cyan-700 dark:text-cyan-300',
  };
</script>

{#snippet code()}
  <code class="font-mono text-slate-900 dark:text-slate-100"
    >{#each segments as segment, index (index)}<span
        class={segment.tone && tones[segment.tone]}>{segment.text}</span
      >{/each}</code
  >
{/snippet}

{#if block}
  <div class="relative min-w-0 rounded-md bg-slate-50 dark:bg-slate-950">
    <pre
      class={[
        'p-3 text-xs leading-6 whitespace-pre-wrap wrap-break-word',
        onRun && 'pr-14',
      ]}>{@render code()}</pre>
    {#if onRun}
      <HoverText
        text="Replace Input with this example and calculate."
        align="end"
        wrapperClass="absolute top-2 right-2"
      >
        <button
          type="button"
          aria-label={`Run ${exampleName} in Input`}
          class="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          onclick={() => onRun?.(source)}
        >
          <ClipboardIcon />
        </button>
      </HoverText>
    {/if}
  </div>
{:else}
  {@render code()}
{/if}
