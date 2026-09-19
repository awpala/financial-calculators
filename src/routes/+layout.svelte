<!--
@component
Owns the responsive application shell, contextual rail, and theme state for one mounted layout.
-->
<script lang="ts">
  import { APP_NAME } from '#lib';
  import '../app.css';
  import { onMount, type Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { online } from 'svelte/reactivity/window';
  import { slide } from 'svelte/transition';
  import Spinner from '#lib/components/elements/Spinner.svelte';
  import Sidebar from '#lib/components/layout/Sidebar.svelte';
  import Topbar from '#lib/components/views/shell/Topbar.svelte';
  import { setShellContext, type ContextualRail } from '#lib/context/shell.js';
  import {
    normalizeRailOpen,
    RAIL_OPEN_BY_DEFAULT,
    RAIL_VISIBILITY_STORAGE_KEY,
  } from '#lib/state/rail-visibility.js';
  import { persisted } from '#lib/state/storage.svelte.js';
  import {
    ThemeStore,
    detectInitialTheme,
    setThemeContext,
  } from '#lib/state/theme.svelte.js';

  /** Public inputs and content for this layout. */
  type Props = {
    /** Current route content rendered inside the shell's scrolling main region. */
    children: Snippet;
  };

  let { children }: Props = $props();

  // Installed on the context rather than held at module scope: a module-level
  // cell in a `.svelte.ts` file is one object shared by every request this Node
  // process serves, so one visitor's theme would become the next visitor's.
  const theme = setThemeContext(new ThemeStore(detectInitialTheme()));

  // Keep the persistent contextual rail in tablet-sized editor and browser
  // panes; only phone widths move it into the on-demand drawer.
  const smallViewport = new MediaQuery('max-width: 767px', false);
  // Labeled primary navigation needs the width the title and the controls
  // beside it leave only from the large breakpoint up; between that and phone
  // widths the entries show their icons, with their names as hover text.
  const compactNavigation = new MediaQuery('max-width: 1023px', false);

  // Collapsing belongs to the sidebar itself, not to the route showing it: one
  // remembered state carries across every view that lends the shell a rail, so
  // registering content never re-decides whether the sidebar is open.
  const railOpenStore = persisted<unknown>(
    RAIL_VISIBILITY_STORAGE_KEY,
    RAIL_OPEN_BY_DEFAULT,
  );

  let contextualRail = $state.raw<ContextualRail>();
  let desktopRailOpen = $state(normalizeRailOpen(railOpenStore.value));
  let contextDrawerOpen = $state(false);
  let hydrated = $state(false);

  onMount(() => {
    hydrated = true;
  });

  const contextMenuLabel = $derived(
    contextualRail
      ? smallViewport.current
        ? contextDrawerOpen
          ? `Close ${contextualRail.label}`
          : `Open ${contextualRail.label}`
        : desktopRailOpen
          ? `Hide ${contextualRail.label}`
          : `Show ${contextualRail.label}`
      : undefined,
  );
  const contextualRailReady = $derived(
    contextualRail?.ready === undefined || contextualRail.ready(),
  );
  const contextMenuExpanded = $derived(
    contextualRail
      ? smallViewport.current
        ? contextDrawerOpen
        : desktopRailOpen
      : false,
  );

  function toggleContextMenu() {
    if (!contextualRail) return;
    if (smallViewport.current) {
      contextDrawerOpen = !contextDrawerOpen;
      return;
    }
    desktopRailOpen = !desktopRailOpen;
    railOpenStore.value = desktopRailOpen;
  }

  setShellContext({
    registerContextualRail(rail) {
      contextualRail = rail;
      return () => {
        if (contextualRail !== rail) return;
        contextualRail = undefined;
        contextDrawerOpen = false;
      };
    },
    closeContextDrawer() {
      contextDrawerOpen = false;
    },
    contextualDrawerOpen: () => contextDrawerOpen,
    smallViewport: () => smallViewport.current,
  });

  $effect(() => {
    document.documentElement.classList.toggle('dark', theme.current === 'dark');
  });

  // Widening past the breakpoint has to clear the drawer, or it reappears
  // unbidden on the way back down.
  $effect(() => {
    if (!smallViewport.current) contextDrawerOpen = false;
  });
</script>

<svelte:head>
  <title>{APP_NAME}</title>
  <meta name="description" content={`Application shell for ${APP_NAME}.`} />
</svelte:head>

{#snippet railBody()}
  {#if contextualRail}
    {#if contextualRailReady}
      {@render contextualRail.content()}
    {:else}
      <div class="grid h-full place-items-center p-6">
        <Spinner label={`Loading ${contextualRail.label}`} class="size-6" />
      </div>
    {/if}
  {/if}
{/snippet}

{#if hydrated && online.current === false}
  <div
    role="status"
    aria-live="polite"
    class="fixed inset-x-0 top-0 z-100 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow dark:bg-amber-950 dark:text-amber-100"
  >
    Offline. Pages you have not loaded may be unavailable.
  </div>
{/if}

<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>
<div
  class="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
>
  <Topbar
    {contextMenuLabel}
    {contextMenuExpanded}
    onContextMenuToggle={toggleContextMenu}
    smallViewport={smallViewport.current}
    compactNavigation={compactNavigation.current}
  />

  <div class="flex flex-1 overflow-hidden">
    {#if contextualRail && !smallViewport.current && desktopRailOpen}
      <div
        class="h-full shrink-0"
        transition:slide={{ axis: 'x', duration: 200 }}
      >
        <Sidebar>{@render railBody()}</Sidebar>
      </div>
    {/if}

    <main
      id="main-content"
      tabindex="-1"
      class="min-w-0 flex-1 overflow-auto p-6"
    >
      {@render children()}
    </main>
  </div>

  {#if contextualRail && smallViewport.current && contextDrawerOpen}
    <div class="fixed inset-x-0 top-14 bottom-0 z-40 md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onclick={() => (contextDrawerOpen = false)}
        class="absolute inset-0 bg-slate-950/40"
      ></button>
      <div
        class="relative h-full w-[min(20rem,90vw)] shadow-xl"
        transition:slide={{ axis: 'x', duration: 200 }}
      >
        <Sidebar>{@render railBody()}</Sidebar>
      </div>
    </div>
  {/if}
</div>
