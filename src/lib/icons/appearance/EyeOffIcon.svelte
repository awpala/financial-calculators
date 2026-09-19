<!--
@component
Decorative hidden eye icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  };

  let {
    class: className = '',
    size = 16,
    strokeWidth = 1.75,
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
  <path d="M3 3l18 18" />
  <path d="M10.584 10.587A2 2 0 0 0 13.41 13.41" />
  <path
    d="M9.363 5.365A9.466 9.466 0 0 1 12 5c4.6 0 8.567 2.932 9.938 6.651a1 1 0 0 1 0 .698 11.023 11.023 0 0 1-4.08 5.144"
  />
  <path
    d="M6.228 6.228a11.02 11.02 0 0 0-4.166 5.423 1 1 0 0 0 0 .698C3.433 16.068 7.4 19 12 19c1.613 0 3.134-.359 4.5-.999"
  />
</svg>
