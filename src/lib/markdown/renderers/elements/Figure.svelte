<!--
@component
Renders an image with its optional caption and authored intrinsic width.
-->
<script lang="ts">
  import type { FigureNode } from '../../types.js';

  import BlockRenderer from '../BlockRenderer.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** The figure, pairing an image with its caption blocks. */
    node: FigureNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
</script>

<figure class="my-5 text-center">
  <img
    src={node.image.url}
    alt={node.image.alt}
    loading="lazy"
    style:max-width={node.image.maxWidthPx
      ? `${node.image.maxWidthPx}px`
      : undefined}
    class="mx-auto inline-block h-auto max-w-full rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
  />
  {#if node.caption.length > 0}
    <figcaption
      class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
    >
      <BlockRenderer
        nodes={node.caption}
        {depth}
        scope={`${scope}.figure-caption`}
      />
    </figcaption>
  {/if}
</figure>
