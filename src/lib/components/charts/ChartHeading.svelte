<!--
@component
Composes a chart title with optional supporting content and owner-supplied action snippets.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public data, presentation options, and callbacks for this component. */
  type Props = {
    /** Required title displayed in the chart heading. */
    title: string;
    /** Optional supporting text displayed with the title. */
    subtitle?: string;
    /** Header classes; defaults to a flex row with bottom spacing. */
    headerClass?: string;
    /** Title classes; defaults to semibold theme-aware text. */
    titleClass?: string;
    /** Subtitle classes; defaults to small muted theme-aware text. */
    subtitleClass?: string;
    /** Optional supporting content; replaces subtitle when provided. */
    children?: Snippet;
    /** Optional controls rendered at the trailing side of the heading. */
    actions?: Snippet;
  };

  let {
    title,
    subtitle,
    headerClass = 'mb-3 flex items-start justify-between gap-3',
    titleClass = 'text-base font-semibold text-slate-900 dark:text-slate-100',
    subtitleClass = 'text-xs text-slate-500 dark:text-slate-400',
    children,
    actions,
  }: Props = $props();
</script>

<header class={headerClass}>
  <div>
    <h2 class={titleClass}>{title}</h2>
    {#if children}
      {@render children()}
    {:else if subtitle}
      <p class={subtitleClass}>{subtitle}</p>
    {/if}
  </div>
  {#if actions}
    <div class="shrink-0">
      {@render actions()}
    </div>
  {/if}
</header>
