<!--
@component
Applies frozen columns and scroll affordances to authored HTML tables once they are in the DOM. Releases its observers when the document changes or the component is destroyed.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';

  import type { MarkdownDocument } from '../types.js';
  import { annotateHtmlTableDividers } from './html-table.js';

  /** Public inputs and content for this component. */
  type Props = {
    /** The rendered document; a change re-runs the divider annotation pass. */
    doc: MarkdownDocument;
    /** The article content whose HTML tables are annotated. */
    children: Snippet;
  };

  let { doc, children }: Props = $props();

  let rootEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!rootEl) return;
    const currentDoc = doc;
    let cancelled = false;

    void tick().then(() => {
      if (cancelled || doc !== currentDoc || !rootEl) return;
      annotateHtmlTableDividers(rootEl);
    });

    return () => {
      cancelled = true;
    };
  });
</script>

<div bind:this={rootEl} class="contents">
  {@render children()}
</div>
