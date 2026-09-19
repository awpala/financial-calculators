<!--
@component
Decorative visible eye icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  <path
    d="M2.062 12.349a1 1 0 0 1 0-.698C3.433 7.932 7.4 5 12 5s8.567 2.932 9.938 6.651a1 1 0 0 1 0 .698C20.567 16.068 16.6 19 12 19s-8.567-2.932-9.938-6.651Z"
  />
  <circle cx="12" cy="12" r="3" />
</svg>
