<!--
@component
Dispatches one block node to the element component that renders its kind.
-->
<script lang="ts">
  import type { BlockNode } from '../types.js';

  import AsideArticle from './elements/AsideArticle.svelte';
  import Blockquote from './elements/Blockquote.svelte';
  import Callout from './elements/Callout.svelte';
  import CodeBlock from './elements/CodeBlock.svelte';
  import Figure from './elements/Figure.svelte';
  import Heading from './elements/Heading.svelte';
  import HtmlTable from './elements/HtmlTable.svelte';
  import List from './elements/List.svelte';
  import MathBlock from './elements/MathBlock.svelte';
  import MermaidDiagram from './elements/MermaidDiagram.svelte';
  import Paragraph from './elements/Paragraph.svelte';
  import Table from './elements/Table.svelte';
  import ThematicBreak from './elements/ThematicBreak.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** The block to dispatch to its element component. */
    node: BlockNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
    /** The block that follows, which lets a paragraph detect a table title. */
    nextNode?: BlockNode;
  };

  let { node, scope, depth, nextNode }: Props = $props();
</script>

{#if node.type === 'heading'}
  <Heading {node} {scope} {depth} />
{:else if node.type === 'paragraph'}
  <Paragraph {node} {scope} {depth} {nextNode} />
{:else if node.type === 'figure'}
  <Figure {node} {scope} {depth} />
{:else if node.type === 'footnoteDefinition'}
  <span class="hidden" aria-hidden="true"></span>
{:else if node.type === 'mathBlock'}
  <MathBlock value={node.value} />
{:else if node.type === 'codeBlock'}
  <CodeBlock {node} />
{:else if node.type === 'mermaidDiagram'}
  <MermaidDiagram {node} />
{:else if node.type === 'list'}
  <List {node} {scope} {depth} />
{:else if node.type === 'blockquote'}
  <Blockquote {node} {scope} {depth} />
{:else if node.type === 'callout'}
  <Callout {node} {scope} {depth} />
{:else if node.type === 'asideArticle'}
  <AsideArticle {node} {scope} {depth} />
{:else if node.type === 'table'}
  <Table {node} {scope} {depth} />
{:else if node.type === 'htmlTable'}
  <HtmlTable {node} {scope} />
{:else if node.type === 'thematicBreak'}
  <ThematicBreak />
{/if}
