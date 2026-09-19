<!--
@component
Displays a contextual-rail section heading with an optional count of what the section currently shows.
-->
<script lang="ts">
  /** Public inputs for this component. */
  type Props = {
    /** Heading text for the section. */
    title: string;
    /** Optional summary of the section's contents, such as a result count. */
    count?: string;
  };

  let { title, count }: Props = $props();
</script>

<div class="flex items-center justify-between gap-3">
  <h2 class="text-sm font-semibold">{title}</h2>
  {#if count}
    <span class="shrink-0 text-xs text-slate-500">{count}</span>
  {/if}
</div>
