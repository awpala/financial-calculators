<!--
@component
Renders a pipe table, including subheader rows and per-column alignment.
-->
<script lang="ts">
  import type { TableNode } from '../../types.js';

  import InlineRenderer from '../InlineRenderer.svelte';
  import { freezeLeftColumns } from '../frozen-columns.js';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The table, with its column alignments, header, and rows. */
    node: TableNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
  const renderer = useMarkdownRenderer();
  const denseLayout = $derived(renderer.denseTableLayout(node));
</script>

<div class="my-5 max-w-full">
  <div
    class={`mx-auto max-w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 ${denseLayout ? 'w-full' : 'w-fit'}`}
  >
    <div class="max-h-[82vh] overflow-x-auto overflow-y-auto">
      <table
        data-is-dense-content-table={node.isDenseContent || undefined}
        data-freeze-cols-left-offset={node.frozenLeftColumns || undefined}
        {@attach freezeLeftColumns(node.frozenLeftColumns)}
        class={`w-full max-w-full border-separate border-spacing-0 text-sm ${denseLayout ? 'table-fixed' : 'table-auto'}`}
        style={denseLayout
          ? `min-width:${denseLayout.minWidthCh}ch`
          : undefined}
      >
        {#if denseLayout}
          <colgroup>
            {#each denseLayout.columnWidths as width, i (i)}
              <col style={`width:${width}%`} />
            {/each}
          </colgroup>
        {/if}
        <thead class="bg-slate-100 dark:bg-slate-800/70">
          <tr>
            {#each node.header.cells as cell, i (i)}
              <th
                class={`sticky top-0 z-20 border-b border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${renderer.tableAlignClass(node.alignments[i])} ${renderer.tableCellFlowClass()}`}
              >
                <InlineRenderer
                  nodes={cell.children}
                  scope={`${scope}.thead.${i}`}
                  {depth}
                />
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each node.rows as row, rowIndex (rowIndex)}
            {#if row.isSubheader}
              {@const subheaderCell = renderer.subheaderCellContent(row)}
              <tr>
                <td
                  colspan={row.cells.length}
                  class={`sticky top-10 z-10 border-t border-slate-300 bg-slate-200 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100 ${renderer.tableCellFlowClass()}`}
                >
                  <InlineRenderer
                    nodes={subheaderCell.children}
                    scope={`${scope}.subheader.${rowIndex}`}
                    {depth}
                  />
                </td>
              </tr>
            {:else}
              <tr
                class={node.frozenLeftColumns
                  ? 'odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800'
                  : 'odd:bg-white even:bg-slate-50/70 dark:odd:bg-slate-900 dark:even:bg-slate-800/20'}
              >
                {#each row.cells as cell, i (i)}
                  <td
                    class={`border-t border-slate-200 px-3 py-2 align-top text-slate-700 dark:border-slate-800 dark:text-slate-300 ${renderer.tableAlignClass(node.alignments[i])} ${renderer.tableCellFlowClass()}`}
                  >
                    <InlineRenderer
                      nodes={cell.children}
                      scope={`${scope}.tbody.${rowIndex}.${i}`}
                      {depth}
                    />
                  </td>
                {/each}
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  /*
   * Frozen columns inherit the row stripe so scrolled content cannot show
   * through, which is why a frozen table stripes with opaque colors. The
   * attachment supplies each cell's measured `left`, so these selectors are
   * global: the compiler cannot see an attribute set from script.
   */
  table[data-freeze-cols-left-offset] :global(td[data-frozen-column]),
  table[data-freeze-cols-left-offset] :global(th[data-frozen-column]) {
    position: sticky;
    z-index: 15;
  }

  /*
   * Only body cells borrow the row stripe. A header cell's `<tr>` carries no
   * background, so inheriting there would leave the sticky corner transparent
   * and let rows scroll through it — the header keeps its own opaque color.
   */
  table[data-freeze-cols-left-offset] :global(td[data-frozen-column]) {
    background-color: inherit;
  }

  table[data-freeze-cols-left-offset] :global(thead th[data-frozen-column]) {
    z-index: 25;
  }

  table[data-freeze-cols-left-offset] :global([data-frozen-column='last']) {
    border-right: 1px solid rgb(203 213 225);
  }

  :global(.dark)
    table[data-freeze-cols-left-offset]
    :global([data-frozen-column='last']) {
    border-right-color: rgb(51 65 85);
  }

  /*
   * Cells whose content was authored as `<p>` or `<ul>`/`<ol>` render real
   * blocks. Collapse the outer margins so a single-paragraph cell still sits
   * flush, and keep list markers, which Tailwind's preflight strips.
   */
  td :global(> p:first-child),
  th :global(> p:first-child) {
    margin-top: 0;
  }

  td :global(> p:last-child),
  th :global(> p:last-child) {
    margin-bottom: 0;
  }

  td :global(ul),
  th :global(ul) {
    list-style: disc outside;
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  td :global(ol),
  th :global(ol) {
    list-style: decimal outside;
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  td :global(li),
  th :global(li) {
    margin: 0.125rem 0;
  }

  td :global(li > p),
  th :global(li > p) {
    margin: 0;
  }
</style>
