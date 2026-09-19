<!--
@component
Decorative sun icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  <circle cx="12" cy="12" r="4" />
  <path d="M12 2.5v2" />
  <path d="M12 19.5v2" />
  <path d="M2.5 12h2" />
  <path d="M19.5 12h2" />
  <path d="m5.2 5.2 1.4 1.4" />
  <path d="m17.4 17.4 1.4 1.4" />
  <path d="m18.8 5.2-1.4 1.4" />
  <path d="m6.6 17.4-1.4 1.4" />
</svg>
