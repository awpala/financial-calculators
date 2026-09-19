<!--
@component
Displays primary navigation, the contextual rail toggle, the Settings entry, and the theme control with shortcut hints.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Component, ComponentProps } from 'svelte';
  import { APP_NAME } from '#lib';
  import NavButton from '#lib/components/views/shell/NavButton.svelte';
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import ThemeToggle from '#lib/components/views/shell/ThemeToggle.svelte';
  import KeypressPrompt from '#lib/components/elements/KeypressPrompt.svelte';
  import HouseIcon from '#lib/icons/navigation/HouseIcon.svelte';
  import AmortizationIcon from '#lib/icons/content/AmortizationIcon.svelte';
  import ScratchpadIcon from '#lib/icons/content/ScratchpadIcon.svelte';
  import CashflowIcon from '#lib/icons/content/CashflowIcon.svelte';
  import MenuIcon from '#lib/icons/layout/MenuIcon.svelte';
  import GearIcon from '#lib/icons/actions/GearIcon.svelte';

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

  const entries: NavEntry[] = [
    { href: '/', label: 'Home', icon: HouseIcon },
    { href: '/scratchpad', label: 'Scratchpad', icon: ScratchpadIcon },
    { href: '/amortization', label: 'Amortization', icon: AmortizationIcon },
    { href: '/cashflow', label: 'Cashflow', icon: CashflowIcon },
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
      <HoverText text={`${contextMenuLabel} · Shift R`}>
        {#snippet content()}
          <span class="inline-flex items-center gap-2"
            >{contextMenuLabel}<KeypressPrompt
              key="Shift R"
              showOnSmall
            /></span
          >
        {/snippet}
        <button
          type="button"
          aria-label={contextMenuLabel}
          aria-expanded={contextMenuExpanded}
          aria-keyshortcuts="Shift+R"
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
      !smallViewport && 'justify-center',
    ]}
  >
    {#each entries as entry (entry.href)}
      <NavButton {...entry} {iconOnly} />
    {/each}
  </nav>

  <div class="ml-auto flex shrink-0 items-center gap-0.5">
    <HoverText text="Settings · Shift S">
      {#snippet content()}
        <span class="inline-flex items-center gap-2"
          >Settings<KeypressPrompt key="Shift S" showOnSmall /></span
        >
      {/snippet}
      <a
        href={resolve('/settings')}
        aria-label="Settings"
        aria-keyshortcuts="Shift+S"
        aria-current={page.route.id?.startsWith('/settings')
          ? 'page'
          : undefined}
        class={[
          controlClass,
          page.route.id?.startsWith('/settings') &&
            'bg-slate-100 dark:bg-slate-800',
        ]}><GearIcon class="size-5" /></a
      >
    </HoverText>
    <div class="flex h-11 w-11 items-center justify-center">
      <ThemeToggle />
    </div>
  </div>
</header>
