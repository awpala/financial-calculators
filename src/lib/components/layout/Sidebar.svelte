<!--
@component
Provides the responsive width and border for contextual rail content supplied by the owner.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public content inputs for the contextual rail shell. */
  type Props = {
    /** Contextual rail content; its owner manages scrolling and interactions. */
    children: Snippet;
  };

  let { children }: Props = $props();
</script>

<aside
  class="h-full w-[min(20rem,90vw)] shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 md:w-max md:min-w-72 md:max-w-[min(30rem,40vw)]"
>
  {@render children()}
</aside>
