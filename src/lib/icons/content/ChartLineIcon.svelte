<!--
@component
Decorative line chart icon drawn in currentColor. Hidden from assistive technology; the control or copy it sits beside carries the meaning.
-->
<script lang="ts">
  /** Public inputs for this decorative icon. */
  type Props = {
    /** Classes applied to the SVG for size, color, and layout; defaults to empty. */
    class?: string;
    /** Square edge length in pixels for call sites that do not size with classes; a sizing class overrides it. Defaults to `16`. */
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
  <path
    d="M3 17.5a1.5 1.5 0 0 0 2.121 0l3.379-3.379a1.5 1.5 0 0 1 2.121 0l2.758 2.758a1.5 1.5 0 0 0 2.121 0l5.379-5.379A1.5 1.5 0 1 0 18.758 9.38l-4.318 4.319a1.5 1.5 0 0 1-2.121 0l-2.758-2.758a1.5 1.5 0 0 0-2.121 0L3 15.379A1.5 1.5 0 0 0 3 17.5Z"
  />
  <circle cx="4" cy="16.5" r="1.5" />
  <circle cx="9.5" cy="12.5" r="1.5" />
  <circle cx="13.5" cy="16" r="1.5" />
  <circle cx="20" cy="10.5" r="1.5" />
</svg>
