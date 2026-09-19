<!--
@component
Renders an ordered or unordered list, preserving authored nesting.
-->
<script lang="ts">
  import type { ListNode } from '../../types.js';

  import BlockRenderer from '../BlockRenderer.svelte';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The list, including its ordering, marker kind, and items. */
    node: ListNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
  const renderer = useMarkdownRenderer();
  const start = $derived(
    node.start !== undefined && node.start !== 1 ? node.start : undefined,
  );
</script>

{#if node.ordered}
  <ol class={renderer.listClass(true, depth, node.markerKind)} {start}>
    {#each node.items as item, i (i)}
      <li
        class="marker:text-slate-500 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
      >
        <BlockRenderer
          nodes={item.children}
          depth={depth + 1}
          scope={`${scope}.ol.${i}`}
        />
      </li>
    {/each}
  </ol>
{:else}
  <ul class={renderer.listClass(false, depth)}>
    {#each node.items as item, i (i)}
      <li
        class="marker:text-slate-500 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
      >
        <BlockRenderer
          nodes={item.children}
          depth={depth + 1}
          scope={`${scope}.ul.${i}`}
        />
      </li>
    {/each}
  </ul>
{/if}
