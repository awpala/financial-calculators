<!--
@component
Renders one inline node tree: emphasis, links, code spans, math, and footnote and definition references.
-->
<script lang="ts">
  import Link from '#lib/components/elements/Link.svelte';

  import type { InlineNode } from '../types.js';

  import InlineRenderer from './InlineRenderer.svelte';
  import DefinitionTerm from './elements/DefinitionTerm.svelte';
  import Footnote from './elements/Footnote.svelte';
  import BlockRenderer from './BlockRenderer.svelte';
  import { useMarkdownRenderer } from './state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The inline sequence to render in order. */
    nodes: InlineNode[];
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { nodes, scope, depth }: Props = $props();
  const renderer = useMarkdownRenderer();
</script>

{#each nodes as node, i (i)}
  {#if node.type === 'text'}
    {node.value}
  {:else if node.type === 'lineBreak'}
    <br />
  {:else if node.type === 'bold'}
    <strong class="font-semibold text-slate-900 dark:text-slate-100">
      <InlineRenderer nodes={node.children} scope={`${scope}.${i}`} {depth} />
    </strong>
  {:else if node.type === 'italic'}
    <em
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></em
    >
  {:else if node.type === 'strikethrough'}
    <s class="text-slate-500 dark:text-slate-500"
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></s
    >
  {:else if node.type === 'underline'}
    <u
      class="underline decoration-blue-600/70 underline-offset-2 dark:decoration-blue-300/70"
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></u
    >
  {:else if node.type === 'code'}
    <code
      class="rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >{#if node.children}<InlineRenderer
          nodes={node.children}
          scope={`${scope}.${i}`}
          {depth}
        />{:else}{node.value}{/if}</code
    >
  {:else if node.type === 'link'}
    <Link href={node.url}>
      <InlineRenderer nodes={node.children} scope={`${scope}.${i}`} {depth} />
    </Link>
  {:else if node.type === 'image'}
    <span class="my-4 block text-center">
      <img
        src={node.url}
        alt={node.alt}
        loading="lazy"
        style:max-width={node.maxWidthPx ? `${node.maxWidthPx}px` : undefined}
        class="mx-auto inline-block h-auto max-w-full rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
      />
    </span>
  {:else if node.type === 'mathInline'}
    <span class="mx-0.5">\({renderer.normalizeLatexValue(node.value)}\)</span>
  {:else if node.type === 'mathDisplayInline'}
    <span class="my-3 block text-center"
      >\[{renderer.normalizeLatexValue(node.value)}\]</span
    >
  {:else if node.type === 'embeddedBlocks'}
    <BlockRenderer
      nodes={node.blocks}
      depth={depth + 1}
      scope={`${scope}.embedded.${i}`}
    />
  {:else if node.type === 'coloredText'}
    <span style:color={node.color}
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></span
    >
  {:else if node.type === 'superscript'}
    <sup
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></sup
    >
  {:else if node.type === 'subscript'}
    <sub
      ><InlineRenderer
        nodes={node.children}
        scope={`${scope}.${i}`}
        {depth}
      /></sub
    >
  {:else if node.type === 'footnoteReference'}
    {@const refToken = `${scope}.${i}`}
    <Footnote id={node.id} token={refToken} />
  {:else if node.type === 'definitionReference'}
    {@const refToken = `${scope}.${i}`}
    <DefinitionTerm
      term={node.term}
      definition={node.definition}
      token={refToken}
    >
      <InlineRenderer nodes={node.children} scope={refToken} {depth} />
    </DefinitionTerm>
  {/if}
{/each}
