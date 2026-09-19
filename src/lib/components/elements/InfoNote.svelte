<!--
@component
Pairs supplemental information with a decorative Info icon. Inline notes fit forms and charts; the panel variant sets apart page-level guidance.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import InfoIcon from '#lib/icons/status/InfoIcon.svelte';

  /** Supplemental copy and its visual prominence. */
  type Props = {
    /** Informational text or inline markup rendered as a paragraph. */
    children: Snippet;
    /** Inline compact guidance or a padded page-level panel; defaults to inline. */
    variant?: 'inline' | 'panel';
    /** Optional wrapper layout classes, such as a width limit and auto margins; defaults to empty. */
    class?: string;
  };
  let { children, variant = 'inline', class: className = '' }: Props = $props();
</script>

<div
  class={[
    'flex items-start gap-3 text-left leading-relaxed',
    variant === 'panel'
      ? 'rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400'
      : 'text-xs text-slate-500 dark:text-slate-400',
    className,
  ]}
>
  <InfoIcon
    class={variant === 'panel'
      ? 'mt-0.5 size-5 shrink-0'
      : 'mt-0.5 size-4 shrink-0'}
  />
  <p class="min-w-0">{@render children()}</p>
</div>
