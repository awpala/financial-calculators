<!--
@component
Centers a route's content in the shared page column that every full-page surface uses.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public inputs and content for this component. */
  type Props = {
    /** Page content rendered inside the column. */
    children: Snippet;
    /** Column width; defaults to the wide content layout used by data-heavy routes. */
    width?: 'wide' | 'narrow';
    /** Additional classes, such as the height constraints a scrolling route needs. Defaults to an empty string. */
    class?: string;
  };

  let { children, width = 'wide', class: className = '' }: Props = $props();
</script>

<div
  class={[
    'mx-auto flex w-full flex-col',
    width === 'wide' ? 'max-w-384' : 'max-w-lg md:px-3',
    className,
  ]}
>
  {@render children()}
</div>
