<!--
@component
Frames editable inputs with Clear/Reset actions, their explanatory hover text, and optional validation feedback. The caller owns field state, action policy, and content.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from '#lib/components/elements/Card.svelte';
  import Button from '#lib/components/elements/Button.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  /** Public content and action contracts for a group of editable inputs. */
  type Props = {
    /** Section heading and accessible name. */
    title: string;
    /** Explains which values Clear removes and which preferences it preserves. */
    clearDescription: string;
    /** Explains the source and scope of the values restored by Reset. */
    resetDescription: string;
    /** Caller-owned action that empties input values and manages focus. */
    onClear: () => void;
    /** Caller-owned action that restores the appropriate default values. */
    onReset: () => void;
    /** Validation feedback announced as a status; omitted for valid inputs. */
    error?: string;
    /** Input controls, with bindings owned by the caller. */
    children: Snippet;
    /** Internal spacing and additional layout classes; defaults to space-y-5. */
    class?: string;
  };
  let {
    title,
    clearDescription,
    resetDescription,
    onClear,
    onReset,
    error,
    children,
    class: className = 'space-y-5',
  }: Props = $props();
</script>

<Card as="section" class={`min-w-0 p-5 sm:p-6 ${className}`} aria-label={title}>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="text-base font-semibold">{title}</h2>
    <div class="flex items-center gap-2">
      <HoverText text={clearDescription}
        ><Button variant="secondary" onclick={onClear}>Clear</Button></HoverText
      >
      <HoverText text={resetDescription} align="end"
        ><Button variant="secondary" onclick={onReset}>Reset</Button></HoverText
      >
    </div>
  </div>
  {@render children()}
  {#if error}<p
      role="status"
      class="text-sm text-amber-700 dark:text-amber-400"
    >
      {error}
    </p>{/if}
</Card>
