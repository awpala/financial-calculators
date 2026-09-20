<!--
@component
Provides the responsive width, border, and named landmark for contextual rail content supplied by the owner.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public content inputs for the contextual rail shell. */
  type Props = {
    /** Accessible name for the rail's complementary landmark; the shell passes the registered rail's label. */
    label: string;
    /** Contextual rail content; its owner manages scrolling and interactions. */
    children: Snippet;
  };

  let { label, children }: Props = $props();
</script>

<aside
  aria-label={label}
  class="h-full w-[min(20rem,90vw)] shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 md:w-max md:min-w-72 md:max-w-[min(30rem,40vw)]"
>
  {@render children()}
</aside>
