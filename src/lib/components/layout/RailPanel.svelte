<!--
@component
Frames a contextual rail: a full-height column with a fixed heading band above its own scrolling body.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import RailSectionHeading from '#lib/components/layout/RailSectionHeading.svelte';

  /** Public inputs and content for this component. */
  type Props = {
    /** Heading displayed in the band above the scrolling body. */
    title: string;
    /** Optional summary of what the body currently shows, such as a result count. */
    count?: string;
    /** Optional controls rendered in the band beneath the heading row. */
    header?: Snippet;
    /** The rail's scrolling body. */
    children: Snippet;
  };

  let { title, count, header, children }: Props = $props();
</script>

<div class="flex h-full flex-col">
  <div
    class="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
  >
    <RailSectionHeading {title} {count} />
    {@render header?.()}
  </div>

  <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
    {@render children()}
  </div>
</div>
