<!--
@component
Renders an authored aside article with its own heading, body, and theme data.
-->
<script lang="ts">
  import type { AsideArticleNode } from '../../types.js';

  import BlockRenderer from '../BlockRenderer.svelte';
  import InlineRenderer from '../InlineRenderer.svelte';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The aside article, whose data attributes carry its theme. */
    node: AsideArticleNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
  const renderer = useMarkdownRenderer();
  const article = $derived(renderer.articleHeadingAndBody(node.children));
  const articleTheme = $derived(renderer.articleThemeData(node.dataAttributes));
</script>

<article
  {...articleTheme.attributes}
  class="relative isolate my-6 max-h-[82vh] overflow-auto rounded-lg border border-slate-300 bg-slate-50/40 px-5 pt-0 pb-4 dark:border-slate-700 dark:bg-slate-900/20"
  style={articleTheme.containerStyle}
>
  {#if article.title}
    <p
      class="sticky top-0 z-30 -mx-5 mt-0 mb-4 border-b border-slate-300 bg-slate-50 px-5 py-3 text-center font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      style={articleTheme.titleStyle}
    >
      <InlineRenderer
        nodes={article.title}
        scope={`${scope}.article-title`}
        {depth}
      />
    </p>
  {/if}
  <BlockRenderer nodes={article.body} {depth} scope={`${scope}.article-body`} />
</article>
