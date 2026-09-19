<!--
@component
Renders a footnote reference whose body opens in a popup.
-->
<script lang="ts">
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** The footnote's document-level identifier, resolved to its definition on open. */
    id: string;
    /** Identity of this trigger's popup, unique within the document. */
    token: string;
  };

  let { id, token }: Props = $props();
  const renderer = useMarkdownRenderer();
  let lastNonMousePointerUp = Number.NEGATIVE_INFINITY;

  /** Toggle from clicks that were not synthesized for an already-handled touch or pen tap. */
  function handleClick(event: MouseEvent): void {
    if (event.detail > 0 && event.timeStamp - lastNonMousePointerUp < 1_000)
      return;
    renderer.togglePopup(
      token,
      { kind: 'footnote', id },
      event.currentTarget as HTMLButtonElement,
    );
  }

  /** Activate a touch or pen tap as soon as the pointer is released. */
  function handlePointerUp(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;
    lastNonMousePointerUp = event.timeStamp;
    renderer.togglePopup(
      token,
      { kind: 'footnote', id },
      event.currentTarget as HTMLButtonElement,
    );
  }
</script>

<span class="relative inline-block align-super" data-popup-token={token}>
  <button
    type="button"
    onclick={handleClick}
    onpointerup={handlePointerUp}
    onpointerenter={(event) => {
      if (event.pointerType !== 'mouse') return;
      renderer.showPopupOnHover(
        token,
        { kind: 'footnote', id },
        event.currentTarget as HTMLButtonElement,
      );
    }}
    onpointerleave={(event) => {
      if (event.pointerType === 'mouse') renderer.hidePopupOnHover(token);
    }}
    class="ml-0.5 cursor-pointer rounded-sm px-0.5 text-[0.72em] font-semibold text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
    aria-label={`Open footnote ${id}`}
  >
    [{id}]
  </button>
</span>
