<!--
@component
Renders a square bordered control whose only content is a decorative icon.
-->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<HTMLAttributes<HTMLElement>, 'class'>;

  /** Public inputs, callbacks, and content for this component. */
  type Props = SharedAttributes & {
    /** Accessible name, since the control renders no text. */
    'aria-label': string;
    /** Whether the control is inoperable. Defaults to `false`. */
    disabled?: boolean;
    /** Additional classes, for positioning and alignment at the call site. Defaults to an empty string. */
    class?: string;
    /** Decorative icon rendered inside the control. */
    children: Snippet;
  };

  let {
    disabled = false,
    class: className = '',
    children,
    ...attributes
  }: Props = $props();
</script>

<button
  type="button"
  {disabled}
  class={[
    'inline-flex size-11 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
    className,
  ]}
  {...attributes}
>
  {@render children()}
</button>
