<!--
@component
Toggles the ThemeStore installed by the nearest ancestor from its switch or Shift+T outside editable fields. Takes no props and keeps theme state in that context.
-->
<script lang="ts">
  import HoverText from '#lib/components/behaviors/HoverText.svelte';
  import KeypressPrompt from '#lib/components/elements/KeypressPrompt.svelte';
  import Switch from '#lib/components/elements/Switch.svelte';
  import { useKeyboard } from '#lib/hooks/useKeyboard.js';
  import MoonIcon from '#lib/icons/appearance/MoonIcon.svelte';
  import SunIcon from '#lib/icons/appearance/SunIcon.svelte';
  import { getThemeContext } from '#lib/state/theme.svelte.js';

  const theme = getThemeContext();
  const isDark = $derived(theme.current === 'dark');
  const THEME_TOGGLE_SHORTCUT_LABEL = 'Shift T';
  const THEME_TOGGLE_KEYSHORTCUTS = 'Shift+T';

  function isThemeToggleShortcut(event: KeyboardEvent): boolean {
    return (
      event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.code === 'KeyT' || event.key.toLocaleLowerCase() === 't')
    );
  }

  useKeyboard((event) => {
    if (!isThemeToggleShortcut(event)) return;
    event.preventDefault();
    theme.toggle();
  });
</script>

{#snippet themeHint()}
  <span>Change UI theme</span>
  <span class="ml-1 inline-flex items-center gap-1">
    <span aria-hidden="true">(toggle via</span>
    <span class="sr-only"> (toggle via </span>
    <KeypressPrompt key={THEME_TOGGLE_SHORTCUT_LABEL} showOnSmall />
    <span aria-hidden="true">)</span>
    <span class="sr-only">)</span>
  </span>
{/snippet}

<HoverText text="Change UI theme (toggle via Shift T)" content={themeHint}>
  <Switch
    checked={isDark}
    label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    ariaKeyShortcuts={THEME_TOGGLE_KEYSHORTCUTS}
    onChange={() => theme.toggle()}
  >
    {#if isDark}
      <MoonIcon class="size-3 text-slate-700" />
    {:else}
      <SunIcon class="size-3 text-amber-500" />
    {/if}
  </Switch>
</HoverText>
