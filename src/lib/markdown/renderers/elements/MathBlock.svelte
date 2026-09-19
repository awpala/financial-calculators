<!--
@component
Renders a display-math block for MathJax to typeset.
-->
<script lang="ts">
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The block's LaTeX source, normalized before it is handed to MathJax. */
    value: string;
  };

  let { value }: Props = $props();
  const renderer = useMarkdownRenderer();
</script>

<div class="my-4 text-center">\[{renderer.normalizeLatexValue(value)}\]</div>
