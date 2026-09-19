<!--
@component
Toggles the ThemeStore installed by the nearest ancestor from its switch or Shift+T outside editable fields. Its appearance follows the pre-paint document theme, while interactive state stays in context. Takes no props.
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
  <span class="inline-flex items-center gap-2">
    <span>Change UI theme</span>
    <KeypressPrompt key={THEME_TOGGLE_SHORTCUT_LABEL} showOnSmall />
  </span>
{/snippet}

<HoverText text="Change UI theme · Shift T" content={themeHint}>
  <Switch
    variant="theme"
    checked={isDark}
    label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    ariaKeyShortcuts={THEME_TOGGLE_KEYSHORTCUTS}
    onChange={() => theme.toggle()}
  >
    <MoonIcon class="hidden size-3 text-slate-700 dark:block" />
    <SunIcon class="size-3 text-amber-500 dark:hidden" />
  </Switch>
</HoverText>
