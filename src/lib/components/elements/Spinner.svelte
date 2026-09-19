<!--
@component
Announces a loading status with an animated decorative indicator.
-->
<script lang="ts">
  /** Public inputs for the loading announcement and indicator. */
  type Props = {
    /** Accessible status text; defaults to Loading. */
    label?: string;
    /** Classes for the animated SVG; defaults to size-8. */
    class?: string;
  };

  let { label = 'Loading', class: className = 'size-8' }: Props = $props();
</script>

<span role="status" aria-live="polite" aria-label={label} class="inline-flex">
  <svg
    viewBox="0 0 24 24"
    fill="none"
    class={['animate-spin text-slate-500 dark:text-slate-400', className]}
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      stroke-width="3"
      class="opacity-25"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>
  <span class="sr-only">{label}</span>
</span>
