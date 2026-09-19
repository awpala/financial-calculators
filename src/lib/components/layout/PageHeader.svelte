<!--
@component
Renders a route's centered title and supporting copy, with optional trailing content such as a status badge.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public inputs and content for this component. */
  type Props = {
    /** Page title rendered as the route's level-one heading. */
    title: string;
    /** Supporting copy describing what the route does. */
    description: string;
    /** Horizontal alignment for the title, description, and optional trailing content; defaults to centered. */
    align?: 'center' | 'start';
    /** Optional content rendered beneath the supporting copy. */
    children?: Snippet;
    /** Additional classes applied to the header wrapper. Defaults to an empty string. */
    class?: string;
  };

  let {
    title,
    description,
    align = 'center',
    children,
    class: className = '',
  }: Props = $props();
</script>

<section
  class={[
    'shrink-0',
    align === 'center' ? 'text-center' : 'text-left',
    className,
  ]}
>
  <h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
  <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
  {@render children?.()}
</section>
