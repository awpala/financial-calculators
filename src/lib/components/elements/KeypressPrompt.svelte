<!--
@component
Displays a keyboard shortcut as a keycap, hidden below the medium breakpoint, whose text joins the enclosing control's accessible name.
-->
<script lang="ts">
  import type { Component } from 'svelte';
  import EnterKeyIcon from '#lib/icons/keyboard/EnterKeyIcon.svelte';
  import LeftArrowKeyIcon from '#lib/icons/keyboard/LeftArrowKeyIcon.svelte';
  import RightArrowKeyIcon from '#lib/icons/keyboard/RightArrowKeyIcon.svelte';
  import ShiftKeyIcon from '#lib/icons/keyboard/ShiftKeyIcon.svelte';
  import SpacebarIcon from '#lib/icons/keyboard/SpacebarIcon.svelte';

  /** Public inputs for the keycap label and presentation. */
  type Props = {
    /**
     * The key as it is printed on the member's keyboard — `Space`, `A`,
     * `Ctrl Shift C`. A `Shift`, `Enter`, `Left`, or `Right` in the label is
     * drawn as the arrow printed on that key rather than spelled out, which keeps a chord from
     * crowding the control it annotates; the words are what assistive
     * technology still reads. This is
     * the label, not a `KeyboardEvent.code`: shortcut handlers should match on
     * `code` so a non-QWERTY layout still hits the intended physical key, but
     * what is drawn here is what the member reads off the keycap.
     */
    key: string;
    /**
     * Which ground the cap sits on. `surface` is the default: a light card or
     * row, where the cap needs its own background and border. `inverted` is for
     * a cap inside a filled primary button, where it borrows the button's
     * foreground and needs only a translucent edge.
     */
    tone?: 'surface' | 'inverted';
    /** Positioning within the parent — spacing or alignment, not appearance. Defaults to an empty string. */
    class?: string;
    /** Whether to retain the keycap below the medium breakpoint; defaults to false. */
    showOnSmall?: boolean;
  };

  let {
    key,
    tone = 'surface',
    class: positionClass = '',
    showOnSmall = false,
  }: Props = $props();

  // Chords arrive as one label so every call site keeps passing what the member
  // reads; the cap splits it to draw an arrow in place of the keys that print
  // one. The label is also rendered once for assistive technology, and the
  // drawn parts are hidden from it, so a cap reads as its words wherever it
  // joins an enclosing control's accessible name.
  const KEY_ICONS: Record<string, Component<{ class?: string }>> = {
    Shift: ShiftKeyIcon,
    Enter: EnterKeyIcon,
    Left: LeftArrowKeyIcon,
    Right: RightArrowKeyIcon,
    Space: SpacebarIcon,
  };

  const parts = $derived(key.split(' '));
  // A cap with nothing to draw stays one text node, so a test or a reader
  // looking for its label finds exactly one of it.
  const drawsIcon = $derived(parts.some((part) => part in KEY_ICONS));
</script>

<!--
  One keycap. Every keyboard shortcut hint in the app renders through this, so
  they cannot drift into three slightly different caps again.

  `hidden md:inline-flex` is load-bearing and is not a duplicate of the
  `showShortcuts` guard at the call sites, even though the two breakpoints
  agree. The layout's `MediaQuery('max-width: 767px', false)` reports `false`
  during SSR and until hydration, so `showShortcuts` is true on that first
  render regardless of the real viewport, and the server would otherwise ship a
  visible cap to a phone. The CSS hides it for exactly that window; the guard
  then keeps it out of the DOM entirely once the media query is live.

  The cap is a real `<kbd>`, and its text joins the accessible name of whatever
  encloses it. That is deliberate for a control whose label is the action --
  "Next question, Space" reads correctly -- so keep it inside the button or
  label it annotates rather than floating it alongside.
-->
<kbd
  class={[
    'h-6 min-w-6 shrink-0 items-center justify-center rounded border px-1.5 font-mono text-[0.6875rem]',
    showOnSmall ? 'inline-flex' : 'hidden md:inline-flex',
    tone === 'inverted'
      ? 'border-white/40 font-normal dark:border-slate-500'
      : 'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900',
    positionClass,
    drawsIcon && parts.length > 1 && 'gap-1',
  ]}
>
  {#if drawsIcon}
    <span class="sr-only">{key}</span>
    {#each parts as part, index (index)}
      {@const Icon = KEY_ICONS[part]}
      {#if Icon}
        <Icon class="size-3" />
      {:else}
        <span aria-hidden="true">{part}</span>
      {/if}
    {/each}
  {:else}
    {key}
  {/if}
</kbd>
