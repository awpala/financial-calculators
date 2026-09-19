<!--
@component
Announces a non-empty error message in an alert region.
-->
<script lang="ts">
  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Error text to announce; an empty string hides the alert. */
    message: string;
    /** Additional classes applied to the alert paragraph. Defaults to an empty string. */
    class?: string;
  };

  let { message, class: className = '' }: Props = $props();
</script>

{#if message}
  <p role="alert" class={['text-sm text-red-700 dark:text-red-400', className]}>
    {message}
  </p>
{/if}
