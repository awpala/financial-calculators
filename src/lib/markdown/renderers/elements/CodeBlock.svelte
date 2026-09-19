<!--
@component
Renders a fenced code block with its server-applied highlighting and a copy control.
-->
<script lang="ts">
  import type { CodeBlockNode } from '../../types.js';

  /** Public inputs for this component. */
  type Props = {
    /** The fenced block, with server-highlighted HTML when a grammar matched. */
    node: CodeBlockNode;
  };

  let { node }: Props = $props();
</script>

<figure
  data-code-figure
  class="relative my-4 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 [&>pre]:m-0 [&>pre]:max-h-[82vh] [&>pre]:overflow-x-auto [&>pre]:overflow-y-auto [&>pre]:px-4 [&>pre]:py-3 [&>pre]:text-sm [&>pre]:leading-relaxed [&>pre]:outline-none [&_code]:font-mono"
>
  {#if node.highlightedHtml}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Only Shiki-generated, escaped markup belongs in highlightedHtml. -->
    {@html node.highlightedHtml}
  {:else}
    <pre
      class="m-0 overflow-x-auto bg-slate-100 px-4 py-3 text-slate-900 dark:bg-slate-900 dark:text-slate-100"><code
        class={node.language ? `language-${node.language}` : undefined}
        >{node.value}</code
      ></pre>
  {/if}
  <button
    type="button"
    title="Copy code"
    aria-label="Copy code"
    data-code={node.value}
    class="code-copy"
  >
    <svg class="ready" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <rect
        x="4"
        y="7"
        width="12"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
    </svg>
    <svg class="success" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m5 12 4 4L19 6"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      />
    </svg>
  </button>
</figure>
