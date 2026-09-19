<!--
@component
Delegates copy-button clicks inside its subtree to the clipboard and applies a transient confirmation class. Releases the listener and feedback timers on unmount.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  /** Public inputs and content for this component. */
  type Props = {
    /** Selector matching the copy buttons whose clicks this wrapper delegates. Defaults to `'button.code-copy'`. */
    selector?: string;
    /** Class applied to a button while its copied confirmation is showing. Defaults to `'copied'`. */
    feedbackClass?: string;
    /** How long the confirmation class stays applied, in milliseconds. Defaults to `1500`. */
    feedbackDuration?: number;
    /** Content whose copy buttons are delegated. */
    children: Snippet;
  };

  let {
    selector = 'button.code-copy',
    feedbackClass = 'copied',
    feedbackDuration = 1500,
    children,
  }: Props = $props();

  /** Copy text with the Clipboard API when available, then fall back to execCommand. */
  async function copyText(text: string): Promise<boolean> {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        /* fall through to execCommand path */
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.append(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  /** Own delegation and feedback timers for this mounted subtree only. */
  const attachCopyButtons: Attachment<HTMLDivElement> = (root) => {
    const currentSelector = selector;
    const currentClass = feedbackClass;
    const duration = feedbackDuration;
    // Timer bookkeeping is local to this attachment and is never rendered.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const feedback = new Map<
      HTMLButtonElement,
      ReturnType<typeof setTimeout>
    >();
    let disposed = false;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(currentSelector);
      if (!button || !root.contains(button)) return;

      event.preventDefault();
      event.stopPropagation();

      const rawCode = button.getAttribute('data-code') ?? '';
      void (async () => {
        const copied = await copyText(rawCode);
        if (!copied || disposed) return;

        clearTimeout(feedback.get(button));
        button.classList.add(currentClass);
        feedback.set(
          button,
          setTimeout(() => {
            button.classList.remove(currentClass);
            feedback.delete(button);
          }, duration),
        );
      })();
    };

    root.addEventListener('click', handleClick, true);
    return () => {
      disposed = true;
      root.removeEventListener('click', handleClick, true);
      for (const [button, timer] of feedback) {
        clearTimeout(timer);
        button.classList.remove(currentClass);
      }
      feedback.clear();
    };
  };
</script>

<div {@attach attachCopyButtons}>
  {@render children()}
</div>
