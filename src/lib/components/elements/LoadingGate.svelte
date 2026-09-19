<!--
@component
Reserves the shared page-height block while a route loads and centers its loading indicator.
-->
<script lang="ts">
  import Spinner from '#lib/components/elements/Spinner.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** Accessible status text describing what is loading. */
    label: string;
    /** Classes sizing the indicator; defaults to size-6. */
    spinnerClass?: string;
    /** Additional classes applied to the centering block. Defaults to an empty string. */
    class?: string;
  };

  let {
    label,
    spinnerClass = 'size-6',
    class: className = '',
  }: Props = $props();
</script>

<div class={['grid min-h-88 place-items-center', className]}>
  <Spinner {label} class={spinnerClass} />
</div>
