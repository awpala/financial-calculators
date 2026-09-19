<!--
@component
Renders a paragraph, or a table title when the paragraph is one.
-->
<script lang="ts">
  import type { BlockNode, ParagraphNode } from '../../types.js';

  import InlineRenderer from '../InlineRenderer.svelte';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The paragraph and its inline children. */
    node: ParagraphNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
    /** The block that follows, which marks this paragraph as a table title. */
    nextNode?: BlockNode;
  };

  let { node, scope, depth, nextNode }: Props = $props();
  const renderer = useMarkdownRenderer();
</script>

<p
  class={renderer.paragraphClass(
    node.children,
    node.centered || renderer.isTableTitleParagraph(node, nextNode),
  )}
>
  <InlineRenderer nodes={node.children} scope={`${scope}.paragraph`} {depth} />
</p>
