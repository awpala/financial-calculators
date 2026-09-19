<!--
@component
Owns the responsive application shell, view initialization, contextual rail, Settings return navigation, and theme state for one mounted layout.
-->
<script lang="ts">
  import { APP_NAME } from '#lib';
  import {
    CalculatorSettings,
    setCalculatorSettings,
  } from '#lib/settings/calculator-settings.svelte.js';
  import '../app.css';
  import { onMount, tick, type Snippet } from 'svelte';
  import { afterNavigate, goto, onNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { navigating, page } from '$app/state';
  import { isMainView, settingsDestination } from '#lib/navigation/settings.js';
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
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';
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
  setCalculatorSettings(new CalculatorSettings());

  // Keep the persistent contextual rail in tablet-sized editor and browser
  // panes; only phone widths move it into the on-demand drawer.
  const smallViewport = new MediaQuery('max-width: 767px', false);
  // Labeled primary navigation needs the width the title and the controls
  // beside it leave only from the extra-large breakpoint up; between that and phone
  // widths the entries show their icons, with their names as hover text.
  const compactNavigation = new MediaQuery('max-width: 1279px', false);

  // Collapsing belongs to the sidebar itself, not to the route showing it: one
  // remembered state carries across every view that lends the shell a rail, so
  // registering content never re-decides whether the sidebar is open.
  const railOpenStore = persisted<unknown>(
    RAIL_VISIBILITY_STORAGE_KEY,
    RAIL_OPEN_BY_DEFAULT,
  );
  const settingsReturnView = persisted<unknown>('settings_return_view_v1', '/');
  const settingsHref = $derived(
    resolve(settingsDestination(page.route.id, settingsReturnView.value)),
  );

  let contextualRail = $state.raw<ContextualRail>();
  let desktopRailOpen = $state(normalizeRailOpen(railOpenStore.value));
  let contextDrawerOpen = $state(false);
  let hydrated = $state(false);
  let viewReady = $state(false);
  let revealFrame: number | undefined;
  let revealGeneration = 0;
  const viewLoading = $derived(
    !viewReady ||
      (navigating.to !== null &&
        navigating.to.url.pathname !== navigating.from?.url.pathname),
  );

  function cancelViewReveal(): void {
    revealGeneration += 1;
    if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
    revealFrame = undefined;
  }

  function revealView(): void {
    cancelViewReveal();
    const generation = revealGeneration;
    // Mount-time storage restoration needs a DOM flush. Keep the content
    // measurable for a full rendering cycle so ResizeObserver-backed chart
    // dimensions have also settled before exposing the view.
    void tick().then(() => {
      if (generation !== revealGeneration) return;
      revealFrame = requestAnimationFrame(() => {
        revealFrame = requestAnimationFrame(() => {
          revealFrame = undefined;
          viewReady = true;
        });
      });
    });
  }

  onNavigate(({ from, to }) => {
    if (from?.url.pathname === to?.url.pathname) return;
    cancelViewReveal();
    viewReady = false;
  });
  afterNavigate(({ to }) => {
    if (isMainView(to?.route.id)) settingsReturnView.value = to.route.id;
    revealView();
  });

  onMount(() => {
    hydrated = true;
    return cancelViewReveal;
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

  useKeyboard((event) => {
    if (
      event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      (event.code === 'KeyS' || event.key.toLowerCase() === 's')
    ) {
      event.preventDefault();
      void goto(
        resolve(settingsDestination(page.route.id, settingsReturnView.value)),
      );
      return;
    }
    if (
      contextualRail &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      (event.code === 'KeyR' || event.key.toLowerCase() === 'r')
    ) {
      event.preventDefault();
      toggleContextMenu();
    }
  });

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
  <meta
    name="description"
    content="Work through everyday calculations, explore loan payments, and estimate take-home income."
  />
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
    {settingsHref}
  />

  <div class="relative flex min-h-0 flex-1 overflow-hidden">
    <div
      class={['flex min-h-0 min-w-0 flex-1', viewLoading && 'invisible']}
      inert={viewLoading}
      aria-hidden={viewLoading}
    >
      {#if contextualRail && !smallViewport.current && desktopRailOpen}
        <div
          class="h-full shrink-0"
          transition:slide={{ axis: 'x', duration: viewLoading ? 0 : 200 }}
        >
          <Sidebar>{@render railBody()}</Sidebar>
        </div>
      {/if}

      <main
        id="main-content"
        tabindex="-1"
        aria-busy={viewLoading}
        class="min-w-0 flex-1 overflow-auto p-6"
      >
        {@render children()}
      </main>
    </div>
    {#if viewLoading}
      <div class="absolute inset-0 grid place-items-center p-6">
        <Spinner label="Loading view" />
      </div>
    {/if}
  </div>

  {#if contextualRail && smallViewport.current && contextDrawerOpen && !viewLoading}
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
