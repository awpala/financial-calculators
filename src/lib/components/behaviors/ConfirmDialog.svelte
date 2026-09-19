<!--
@component
Runs an asynchronous confirmation action, prevents dismissal while pending, and displays failures inside the dialog.
-->
<script lang="ts">
  import { errorMessage as getErrorMessage } from '#lib/errors.js';
  import type { Snippet } from 'svelte';
  import ErrorAlert from '#lib/components/elements/ErrorAlert.svelte';
  import Modal from '#lib/components/behaviors/Modal.svelte';
  import Button from '#lib/components/elements/Button.svelte';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Whether the confirmation dialog is visible. */
    open: boolean;
    /** Accessible name of the confirmation dialog. */
    label: string;
    /** Visible heading describing the confirmation action. */
    heading: string;
    /** Text of the confirmation button while idle. */
    confirmLabel: string;
    /** Text of the confirmation button while its action is pending. */
    pendingLabel: string;
    /** Visual emphasis for neutral or destructive confirmation; defaults to neutral. */
    tone?: 'neutral' | 'danger';
    /** Requests closing the dialog after cancellation or dismissal. */
    onClose: () => void;
    /** Performs the confirmed action; rejected promises become dialog error feedback. */
    onConfirm: () => Promise<void>;
    /** Body content describing the consequences of the action. */
    children: Snippet;
  };

  let {
    open,
    label,
    heading,
    confirmLabel,
    pendingLabel,
    tone = 'neutral',
    onClose,
    onConfirm,
    children,
  }: Props = $props();

  let pending = $state(false);
  let errorMessage = $state('');

  function close(): void {
    if (pending) return;
    errorMessage = '';
    onClose();
  }

  async function confirm(): Promise<void> {
    pending = true;
    errorMessage = '';
    try {
      await onConfirm();
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      pending = false;
    }
  }
</script>

<Modal {open} {label} onClose={close} closeOnBackdrop={!pending}>
  <div class="p-6">
    <h2 class="text-lg font-semibold">{heading}</h2>
    <div class="mt-2 space-y-3 text-sm text-slate-600 dark:text-slate-400">
      {@render children()}
    </div>
    <ErrorAlert message={errorMessage} class="mt-4" />
    <div class="mt-6 flex justify-end gap-3">
      <Button
        variant="secondary"
        data-modal-initial-focus
        disabled={pending}
        onclick={close}
      >
        Cancel
      </Button>
      <Button
        variant={tone === 'danger' ? 'danger' : 'primary'}
        disabled={pending}
        busy
        onclick={confirm}
      >
        {pending ? pendingLabel : confirmLabel}
      </Button>
    </div>
  </div>
</Modal>
