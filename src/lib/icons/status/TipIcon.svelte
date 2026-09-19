<!--
@component
Decorative tip callout icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  <path d="M9 18h6" />
  <path d="M10 21h4" />
  <path
    d="M8.3 14.5A6.5 6.5 0 1 1 15.7 14.5c-.8.6-1.2 1.2-1.4 1.8h-4.6c-.2-.6-.6-1.2-1.4-1.8z"
  />
</svg>
