<!--
@component
Decorative upward triangle drawn in currentColor. Callers can rotate it to indicate direction and supply the accessible meaning.
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  /** Public inputs for this decorative icon. */
  type Props = {
    /** Classes applied to the SVG for size, color, rotation, and layout; defaults to empty. */
    class?: ClassValue;
    /** Square edge length in pixels when no sizing class is supplied; defaults to 16. */
    size?: number;
  };

  let { class: className = '', size = 16 }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <path d="m12 4 10 16H2Z" />
</svg>
