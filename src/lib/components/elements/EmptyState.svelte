<!--
@component
Explains why a surface has nothing to show, with an optional recovery action.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public inputs and content for this component. */
  type Props = {
    /** Short statement of what is missing. */
    title: string;
    /** Supporting copy describing how to get content to appear. */
    description: string;
    /** Optional recovery control rendered beneath the supporting copy. */
    action?: Snippet;
    /** Additional classes applied to the panel. Defaults to `'mt-8'`. */
    class?: string;
  };

  let {
    title,
    description,
    action,
    class: className = 'mt-8',
  }: Props = $props();
</script>

<section
  class={[
    'rounded-lg border border-dashed border-slate-300 p-6 dark:border-slate-700',
    className,
  ]}
>
  <h2 class="font-medium">{title}</h2>
  <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
  {@render action?.()}
</section>
