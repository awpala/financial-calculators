import { onMount } from 'svelte';
import { on } from 'svelte/events';

/** Receives a keydown event accepted by useKeyboard's shortcut filters. */
export type KeyboardHandler = (event: KeyboardEvent) => void;

/** Whether the event target is somewhere the user is typing. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.matches('textarea, select') || target.isContentEditable) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(
    target.type,
  );
}

/** Whether a modal currently owns the interaction. */
function modalIsOpen(): boolean {
  return Boolean(
    document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'),
  );
}

/**
 * Register one filtered document-level keyboard shortcut for a component
 * lifetime.
 *
 * The filters are the point: a document-level shortcut that fires while a
 * user is typing turns a letter into a command, and one that fires behind an
 * open dialog acts on a surface the user cannot see. The listener is
 * registered in `onMount` and released by its return value, so it exists only
 * while the component does.
 */
export function useKeyboard(
  handler: KeyboardHandler,
  enabled: () => boolean = () => true,
): void {
  onMount(() => {
    return on(document, 'keydown', (event) => {
      if (
        !enabled() ||
        event.repeat ||
        event.isComposing ||
        isEditableTarget(event.target) ||
        modalIsOpen()
      ) {
        return;
      }
      handler(event);
    });
  });
}
