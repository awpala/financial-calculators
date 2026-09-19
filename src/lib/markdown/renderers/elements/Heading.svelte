<!--
@component
Renders a heading at its level, carrying the anchor id the table of contents links to.
-->
<script lang="ts">
  import type { HeadingNode } from '../../types.js';

  import InlineRenderer from '../InlineRenderer.svelte';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The heading, whose level selects the element and its classes. */
    node: HeadingNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
  const renderer = useMarkdownRenderer();
</script>

<svelte:element
  this={`h${node.level}`}
  id={node.id}
  class={renderer.headingClass[node.level]}
>
  <InlineRenderer nodes={node.children} scope={`${scope}.heading`} {depth} />
</svelte:element>
