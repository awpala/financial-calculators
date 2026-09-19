<!--
@component
Decorative list icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  <line x1="8" y1="6" x2="20" y2="6" />
  <line x1="8" y1="12" x2="20" y2="12" />
  <line x1="8" y1="18" x2="20" y2="18" />
  <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
  <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
  <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
</svg>
