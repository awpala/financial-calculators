<!--
@component
States, in muted body copy, why a route has nothing to act on yet.
-->
<script lang="ts">
  /** Public inputs for this component. */
  type Props = {
    /** Message explaining the current state. */
    message: string;
    /** Additional classes applied to the paragraph. Defaults to `'mt-8'`. */
    class?: string;
  };

  let { message, class: className = 'mt-8' }: Props = $props();
</script>

<p class={['text-sm text-slate-600 dark:text-slate-400', className]}>
  {message}
</p>
