<!--
@component
Links to a static application route and highlights that route and its descendants, with optional icon-only presentation and hover text.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Component } from 'svelte';
  import type { RouteId } from '$app/types';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';

  // Dynamic routes require parameters and cannot be used by shell navigation.
  /** Route IDs with no dynamic parameters, which this navigation control can resolve alone. */
  type StaticRouteId = Exclude<RouteId, `${string}[${string}`>;

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Static route identifier resolved into the link destination. */
    href: StaticRouteId;
    /** Visible link text, or hover text when iconOnly is true. */
    label: string;
    /** Decorative icon component accepting CSS classes. */
    icon: Component<{
      /** CSS classes supplied to the decorative icon. */
      class?: string;
    }>;
    /** Whether to hide the visible label and show hover text; defaults to false. */
    iconOnly?: boolean;
    /** Whether the link fills the available width; defaults to false. */
    fullWidth?: boolean;
    /** Optional callback invoked when the link is clicked. */
    onNavigate?: () => void;
  };

  let {
    href,
    label,
    icon: Icon,
    iconOnly = false,
    fullWidth = false,
    onNavigate,
  }: Props = $props();

  // `resolve()` returns a page-relative path, so the active check compares
  // route ids instead -- those stay absolute and survive a base path.
  const active = $derived(
    page.route.id === href || (page.route.id?.startsWith(`${href}/`) ?? false),
  );
</script>

{#snippet link()}
  <a
    href={resolve(href)}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    onclick={onNavigate}
    class={[
      'pointer-events-auto flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
      fullWidth && 'w-full',
      iconOnly ? 'h-11 w-11 min-w-8 justify-center p-1.5' : 'px-3 py-2',
      active
        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    ]}
  >
    <Icon class="h-5 w-5 shrink-0" />
    {#if !iconOnly}
      <span class="truncate">{label}</span>
    {/if}
  </a>
{/snippet}

<!--
  Icon-only links keep their full touch height but narrow toward 32px when the
  row is crowded, which is what lets every entry fit a phone-width bar without
  spilling onto the controls beside it.
-->
{#if iconOnly}
  <HoverText
    text={label}
    wrapperClass={fullWidth
      ? 'relative flex w-full'
      : 'relative inline-flex min-w-0'}
  >
    {@render link()}
  </HoverText>
{:else}
  {@render link()}
{/if}
