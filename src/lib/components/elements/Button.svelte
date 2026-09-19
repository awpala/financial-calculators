<!--
@component
Renders the application's standard action control in one of three roles, as a link when given href and a button otherwise.
-->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  /**
   * The visual role this control plays in the surface that owns it. `danger`
   * confirms a destructive action; `danger-outline` offers one.
   */
  export type ButtonVariant =
    'primary' | 'secondary' | 'danger' | 'danger-outline';
  /** The control's density. */
  export type ButtonSize = 'sm' | 'md';

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<HTMLAttributes<HTMLElement>, 'class'>;

  /** Public inputs, callbacks, and content for this component. */
  type Props = SharedAttributes & {
    /** Visual role; defaults to primary. */
    variant?: ButtonVariant;
    /** Control density; defaults to md. */
    size?: ButtonSize;
    /** Destination that turns this control into a link. */
    href?: string;
    /** Submit behavior for the button form; ignored when href is set. Defaults to `'button'`. */
    type?: 'button' | 'submit';
    /** Whether the button is inoperable; ignored when href is set. Defaults to `false`. */
    disabled?: boolean;
    /** Whether the disabled state reflects work in flight rather than a blocked action. Defaults to `false`. */
    busy?: boolean;
    /** Additional classes, for positioning and alignment at the call site. Defaults to an empty string. */
    class?: string;
    /** Control label. */
    children: Snippet;
  };

  let {
    variant = 'primary',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    busy = false,
    class: className = '',
    children,
    ...attributes
  }: Props = $props();

  const VARIANTS: Record<ButtonVariant, string> = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
    secondary:
      'border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
    danger: 'bg-red-700 text-white hover:bg-red-600',
    'danger-outline':
      'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30',
  };

  const SIZES: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const classes = $derived([
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    VARIANTS[variant],
    SIZES[size],
    busy ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    className,
  ]);
</script>

{#if href}
  <a {href} class={classes} {...attributes}>{@render children()}</a>
{:else}
  <button {type} {disabled} class={classes} {...attributes}>
    {@render children()}
  </button>
{/if}
