<!--
@component
Decorative calculator icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
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
  <rect x="5" y="2.5" width="14" height="19" rx="2" />
  <rect x="8" y="5.5" width="8" height="3.5" rx="0.5" />
  <path d="M8.5 12.5h.01" />
  <path d="M12 12.5h.01" />
  <path d="M15.5 12.5h.01" />
  <path d="M8.5 15.5h.01" />
  <path d="M12 15.5h.01" />
  <path d="M15.5 15.5h.01" />
  <path d="M8.5 18.5h.01" />
  <path d="M12 18.5h.01" />
  <path d="M15.5 18.5h.01" />
</svg>
