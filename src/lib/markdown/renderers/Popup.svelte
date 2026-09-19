<!--
@component
Displays footnote and definition content in a dismissible bubble positioned by the popup controller.
-->
<script lang="ts">
  import CloseIcon from '#lib/icons/actions/CloseIcon.svelte';
  import BlockRenderer from './BlockRenderer.svelte';
  import InlineRenderer from './InlineRenderer.svelte';
  import type { PopupContent } from './state/popups.svelte.js';
  import type { Attachment } from 'svelte/attachments';

  /** Public inputs for this component. */
  type Props = {
    /** Heading, body, and accessible label for the anchored popup. */
    content: PopupContent;
    /** Inline style carrying the resolved viewport position. */
    style: string;
    /** Show the close button, which hover-opened popups omit. */
    showClose: boolean;
    /** Dismiss the popup. */
    onClose: () => void;
    /** Optional owner attachment for this popup's DOM element; omitted by default. */
    attach?: Attachment<HTMLDivElement>;
  };

  let { content, style, showClose, onClose, attach }: Props = $props();
</script>

<div
  {@attach attach}
  role="dialog"
  aria-label={content.label}
  data-popup
  {style}
  class="fixed z-120 max-h-[82vh] w-[min(94vw,32rem)] max-w-[94vw] overflow-y-auto rounded-lg border border-slate-300 bg-white p-3 shadow-xl sm:w-[min(90vw,40rem)] sm:max-w-[90vw] sm:p-4 dark:border-slate-700 dark:bg-slate-900"
>
  {#if showClose}
    <button
      type="button"
      onclick={onClose}
      class="absolute top-2 right-2 cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label="Close popup"
    >
      <CloseIcon />
    </button>
  {/if}
  <p
    class="mb-1 pr-8 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
  >
    {content.heading}
  </p>
  <div
    class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
  >
    {#if content.body.kind === 'inline'}
      <InlineRenderer
        nodes={content.body.nodes}
        depth={0}
        scope={content.scope}
      />
    {:else if content.body.nodes}
      <BlockRenderer
        nodes={content.body.nodes}
        depth={0}
        scope={content.scope}
      />
    {:else}
      <em>Definition not found.</em>
    {/if}
  </div>
</div>
