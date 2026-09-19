<!--
@component
Decorative padlock icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
-->
<script lang="ts">
  /** Public inputs for this decorative icon. */
  type Props = {
    /** Classes applied to the SVG for size, color, and layout; defaults to empty. */
    class?: string;
    /** Square edge length in pixels for call sites that do not size with classes; a sizing class overrides it. Defaults to `16`. */
    size?: number;
    /** Stroke width for the icon's paths; defaults to 1.75. */
    strokeWidth?: number;
    /** Show a closed shackle; defaults to true. */
    locked?: boolean;
  };

  let {
    class: className = '',
    size = 16,
    strokeWidth = 1.75,
    locked = true,
  }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <rect x="4" y="11" width="16" height="10" rx="2" />
  {#if locked}
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  {:else}
    <path d="M8 11V7a4 4 0 0 1 7.5-1.5" />
  {/if}
</svg>
