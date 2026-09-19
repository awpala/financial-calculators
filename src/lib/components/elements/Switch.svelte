<!--
@component
Displays an accessible on/off control. The owner supplies checked and handles requests to change it.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Current on/off state supplied by the owner. */
    checked: boolean;
    /** Accessible name for the switch. */
    label: string;
    /** Whether interaction is disabled; defaults to false. */
    disabled?: boolean;
    /** Optional keyboard shortcut advertised to assistive technology. */
    ariaKeyShortcuts?: string;
    /** Requests the inverse of the current checked state on activation. */
    onChange: (checked: boolean) => void;
    /** Optional content before the toggle, making the control a full-width row. */
    content?: Snippet;
    /** Optional content rendered inside the moving toggle thumb. */
    children?: Snippet;
  };

  let {
    checked,
    label,
    disabled = false,
    ariaKeyShortcuts,
    onChange,
    content,
    children,
  }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  aria-keyshortcuts={ariaKeyShortcuts}
  {disabled}
  onclick={() => onChange(!checked)}
  class={[
    'outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-slate-100 dark:focus-visible:ring-offset-slate-900',
    content
      ? 'flex w-full items-center justify-between gap-3 rounded text-xs'
      : 'inline-flex h-6 w-11 shrink-0 rounded-full',
  ]}
>
  {#if content}{@render content()}{/if}
  <span
    class={[
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
      checked ? 'bg-slate-700' : 'bg-slate-300',
    ]}
  >
    <span
      class={[
        'pointer-events-none absolute top-0.5 inline-flex size-5 transform items-center justify-center rounded-full bg-white shadow transition-transform duration-200 ease-out',
        checked ? 'translate-x-5.5' : 'translate-x-0.5',
      ]}
    >
      {#if children}{@render children()}{/if}
    </span>
  </span>
</button>
