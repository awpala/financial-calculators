<!--
@component
Displays a native modal dialog controlled by open. Dismissal requests call onClose; the owner must update open. Content may mark its initial focus target with data-modal-initial-focus.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    SURFACE_BORDER_CLASS,
    SURFACE_FILL_CLASS,
  } from '#lib/components/elements/surface.js';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Whether the owner wants the dialog open. */
    open: boolean;
    /** Accessible name for the dialog. */
    label: string;
    /** Requests closure on Escape or an enabled backdrop click; must update open. */
    onClose: () => void;
    /** Dialog content, optionally including a data-modal-initial-focus target. */
    children: Snippet;
    /** Whether clicking the dialog backdrop requests closure; defaults to true. */
    closeOnBackdrop?: boolean;
  };

  let {
    open,
    label,
    onClose,
    children,
    closeOnBackdrop = true,
  }: Props = $props();
  let dialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => {
        dialog
          ?.querySelector<HTMLElement>('[data-modal-initial-focus]')
          ?.focus();
      });
    }
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  aria-label={label}
  oncancel={(event) => {
    event.preventDefault();
    onClose();
  }}
  onclick={(event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  }}
  class={[
    SURFACE_BORDER_CLASS,
    SURFACE_FILL_CLASS,
    'm-auto w-[min(28rem,calc(100%-2rem))] rounded-lg p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:text-slate-100',
  ]}
>
  {@render children()}
</dialog>
