<!--
@component
Renders an ordered run of block nodes at one nesting depth.
-->
<script lang="ts">
  import type { BlockNode } from '../types.js';

  import BlockNodeRenderer from './BlockNodeRenderer.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** The block sequence to render in order. */
    nodes: BlockNode[];
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
  };

  let { nodes, depth, scope }: Props = $props();
</script>

{#each nodes as node, i (i)}
  {@const nextNode = nodes[i + 1]}
  <BlockNodeRenderer {node} {depth} scope={`${scope}.${i}`} {nextNode} />
{/each}
