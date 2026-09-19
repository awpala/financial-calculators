<!--
@component
Displays primary navigation, the contextual rail toggle, and the theme control.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Component, ComponentProps } from 'svelte';
  import { APP_NAME } from '#lib';
  import NavButton from '#lib/components/views/shell/NavButton.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import ThemeToggle from '#lib/components/views/shell/ThemeToggle.svelte';
  import HouseIcon from '#lib/icons/navigation/HouseIcon.svelte';
  import MenuIcon from '#lib/icons/layout/MenuIcon.svelte';
  import NotesIcon from '#lib/icons/content/NotesIcon.svelte';
  import LayersIcon from '#lib/icons/layout/LayersIcon.svelte';

  /** One entry in the primary navigation bar. */
  type NavEntry = {
    /** Static route this entry links to. */
    href: ComponentProps<typeof NavButton>['href'];
    /** Visible text, or hover text when the bar is showing icons only. */
    label: string;
    /** Decorative icon accepting CSS classes. */
    icon: Component<{
      /** Classes supplied to the navigation icon. */
      class?: string;
    }>;
  };

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Optional accessible label for the contextual rail toggle. */
    contextMenuLabel?: string;
    /** Whether the contextual rail or drawer is open; defaults to false. */
    contextMenuExpanded?: boolean;
    /** Optional callback that toggles the contextual rail or drawer. */
    onContextMenuToggle?: () => void;
    /** Whether navigation uses the compact viewport layout. */
    smallViewport: boolean;
    /**
     * Whether primary navigation shows icons only, with each name as hover
     * text, where labeled entries would not fit; defaults to false. Always the
     * case on a small viewport.
     */
    compactNavigation?: boolean;
  };

  let {
    contextMenuLabel,
    contextMenuExpanded = false,
    onContextMenuToggle,
    smallViewport,
    compactNavigation = false,
  }: Props = $props();

  // Retain the reference pages alongside future calculator routes.
  const entries: NavEntry[] = [
    { href: '/', label: 'Home', icon: HouseIcon },
    { href: '/examples', label: 'Examples', icon: LayersIcon },
    { href: '/docs', label: 'Docs', icon: NotesIcon },
  ];
  const iconOnly = $derived(smallViewport || compactNavigation);

  const controlClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100';
</script>

<header
  class={[
    'relative flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2 sm:px-4 dark:border-slate-800 dark:bg-slate-900',
    smallViewport && contextMenuExpanded && 'z-50',
  ]}
>
  <div class="flex shrink-0 items-center gap-1">
    {#if contextMenuLabel && onContextMenuToggle}
      <HoverText text={contextMenuLabel}>
        <button
          type="button"
          aria-label={contextMenuLabel}
          aria-expanded={contextMenuExpanded}
          onclick={onContextMenuToggle}
          class={controlClass}
        >
          <MenuIcon class="h-5 w-5" />
        </button>
      </HoverText>
    {/if}
    <a
      href={resolve('/')}
      aria-label={`${APP_NAME} home`}
      class="hidden text-base font-semibold tracking-tight text-slate-900 lg:block dark:text-slate-100"
    >
      {APP_NAME}
    </a>
  </div>

  <nav
    aria-label="Primary"
    class={[
      smallViewport
        ? 'flex min-w-0 flex-1 items-center justify-center gap-0.5'
        : 'pointer-events-none absolute left-1/2 flex w-full max-w-xl -translate-x-1/2 items-center gap-1',
      !smallViewport && (iconOnly ? 'justify-center' : 'justify-between'),
    ]}
  >
    {#each entries as entry (entry.href)}
      <NavButton {...entry} {iconOnly} />
    {/each}
  </nav>

  <div class="ml-auto flex shrink-0 items-center gap-0.5">
    <div class="flex h-11 w-11 items-center justify-center">
      <ThemeToggle />
    </div>
  </div>
</header>
