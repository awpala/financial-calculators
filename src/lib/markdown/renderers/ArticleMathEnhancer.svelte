<!--
@component
Loads MathJax on demand and typesets the document's math once it is in the DOM.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import type { MarkdownDocument } from '../types.js';
  import type { useMarkdownMath } from './state/math.svelte.js';

  /** Public inputs and content for this component. */
  type Props = {
    /** The rendered document; a change re-runs typesetting. */
    doc: MarkdownDocument;
    /** Math state owning MathJax loading and element typesetting. */
    math: ReturnType<typeof useMarkdownMath>;
    /** The article content whose math is typeset. */
    children: Snippet;
  };

  let { doc, math, children }: Props = $props();

  let rootEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!rootEl) return;
    const element = rootEl;
    const currentDoc = doc;
    let cancelled = false;

    void (async () => {
      await math.ensureMathJaxLoaded();
      if (cancelled || doc !== currentDoc || !element.isConnected) return;
      await math.typesetElement(element);
    })().catch(() => {
      // Math is progressive enhancement; preserve readable source on failure.
    });

    return () => {
      cancelled = true;
      math.clearElement(element);
    };
  });
</script>

<div bind:this={rootEl} class="contents">
  {@render children()}
</div>
