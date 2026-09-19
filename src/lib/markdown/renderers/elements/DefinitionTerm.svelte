<!--
@component
Renders a definition trigger whose term and body open in a popup.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';
  import type { InlineNode } from '../../types.js';

  /** Public inputs and content for this component. */
  type Props = {
    /** The term being defined, used for the popup heading and label. */
    term: string;
    /** The definition body shown in the popup. */
    definition: InlineNode[];
    /** Identity of this trigger's popup, unique within the document. */
    token: string;
    /** The term as it appears in the prose. */
    children: Snippet;
  };

  let { term, definition, token, children }: Props = $props();
  const renderer = useMarkdownRenderer();
</script>

<span data-popup-token={token}>
  <button
    type="button"
    onclick={(event) =>
      renderer.togglePopup(
        token,
        { kind: 'definition', term, definition },
        event.currentTarget as HTMLButtonElement,
      )}
    class="cursor-pointer rounded-sm underline decoration-indigo-500/70 decoration-dotted decoration-2 underline-offset-4 hover:text-indigo-700 hover:decoration-indigo-600 dark:decoration-indigo-400/70 dark:hover:text-indigo-300 dark:hover:decoration-indigo-300"
    aria-label={`Show definition of ${term}`}
  >
    {@render children()}
  </button>
</span>
