<!--
@component
Decorative pin icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
    /** Fill the pin when selected; defaults to false. */
    filled?: boolean;
  };

  let {
    class: className = '',
    size = 16,
    strokeWidth = 1.75,
    filled = false,
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
  <path d="M12 16v6" />
  <path
    d="M9 3h6l-1 6 3 3.5V16H7v-3.5L10 9z"
    fill={filled ? 'currentColor' : 'none'}
  />
</svg>
