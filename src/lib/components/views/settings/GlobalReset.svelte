<!--
@component
Owns the Settings reset warning dialog and completion feedback. The parent supplies the synchronous action that restores saved calculator presets; closing or canceling never invokes it.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import Button from '#lib/components/elements/Button.svelte';
  import ConfirmDialog from '#lib/components/behaviors/ConfirmDialog.svelte';
  /** Reset action owned by the settings controller's route consumer. */
  type Props = {
    /** Restores Amortization and Cashflow working inputs while preserving other state. */
    onReset: () => void;
  };
  let { onReset }: Props = $props();
  let confirmReset = $state(false);
  let resetMessage = $state('');
</script>

<Card as="section" class="space-y-4 p-5 sm:p-6" aria-label="Global reset">
  <div>
    <h2 class="text-base font-semibold">Global reset</h2>
    <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      Restore Amortization and Cashflow inputs to your saved defaults. Your
      Scratchpad work and preferences are preserved.
    </p>
  </div>
  <Button
    variant="danger-outline"
    onclick={() => {
      resetMessage = '';
      confirmReset = true;
    }}>Reset both calculators</Button
  >
  {#if resetMessage}<p
      role="status"
      class="text-sm text-emerald-700 dark:text-emerald-400"
    >
      {resetMessage}
    </p>{/if}
</Card>

<ConfirmDialog
  open={confirmReset}
  label="Confirm global reset"
  heading="Reset both calculators?"
  confirmLabel="Reset both calculators"
  pendingLabel="Resetting…"
  tone="danger"
  onClose={() => {
    confirmReset = false;
  }}
  onConfirm={async () => {
    onReset();
    confirmReset = false;
    resetMessage = 'Amortization and Cashflow now use your saved defaults.';
  }}
>
  <p>
    This replaces all current inputs in Amortization and Cashflow with your
    saved Reset defaults. Your current working values will be lost.
  </p>
  <p>
    Unsaved edits on this settings page are not applied. Scratchpad work, saved
    defaults, and preferences will be preserved.
  </p>
</ConfirmDialog>
