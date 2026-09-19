<!--
@component
Provides a shared table wrapper with configurable header, body, and container
classes for route tables used across user and admin surfaces.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  /** Native attributes forwarded to the outer container, with class owned separately. */
  type DivAttributes = Omit<HTMLAttributes<HTMLDivElement>, 'class'>;

  /** Public inputs and content for this component, plus the container div attributes. */
  type Props = DivAttributes & {
    /** Classes applied to the container that wraps the table. Defaults to an empty string. */
    containerClass?: string;
    /** Classes applied to the table element. Defaults to `'w-full text-left text-sm'`. */
    tableClass?: string;
    /** Classes applied to the header wrapper row container. Defaults to `'text-xs uppercase text-slate-500'`. */
    theadClass?: string;
    /** Classes applied to the body wrapper. Defaults to `'divide-y divide-slate-200 dark:divide-slate-800'`. */
    tbodyClass?: string;
    /**
     * Optional attachment applied to the container (for local scroll persistence
     * and similar behavior).
     */
    attach?: Attachment<HTMLElement> | undefined;
    /** Header cells to render inside a single header row. */
    header: Snippet<[]>;
    /** Full body rows to render inside `<tbody>`. */
    body: Snippet<[]>;
  };

  let {
    containerClass = '',
    tableClass = 'w-full text-left text-sm',
    theadClass = 'text-xs uppercase text-slate-500',
    tbodyClass = 'divide-y divide-slate-200 dark:divide-slate-800',
    attach,
    header,
    body,
    ...containerAttributes
  }: Props = $props();
</script>

<div class={containerClass} {...containerAttributes} {@attach attach}>
  <table class={tableClass}>
    <thead class={theadClass}>
      <tr>{@render header()}</tr>
    </thead>
    <tbody class={tbodyClass}>
      {@render body()}
    </tbody>
  </table>
</div>
