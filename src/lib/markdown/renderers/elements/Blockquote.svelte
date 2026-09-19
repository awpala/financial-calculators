<!--
@component
Renders a block quotation and the blocks nested inside it.
-->
<script lang="ts">
  import type { BlockquoteNode } from '../../types.js';

  import BlockRenderer from '../BlockRenderer.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** The blockquote and its block children. */
    node: BlockquoteNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
</script>

<blockquote
  class="my-4 border-l-4 border-slate-300 bg-slate-100/60 py-1 pr-4 pl-4 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
>
  <BlockRenderer nodes={node.children} {depth} scope={`${scope}.blockquote`} />
</blockquote>
