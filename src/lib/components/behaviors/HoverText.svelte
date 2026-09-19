<!--
@component
Shows text on pointer hover or keyboard focus. Each instance owns its bubble and releases viewport listeners and the popover when hidden or destroyed.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import {
    SURFACE_BORDER_CLASS,
    SURFACE_FILL_CLASS,
  } from '#lib/components/elements/surface.js';

  /** Preferred horizontal relationship between bubble and trigger before viewport clamping. */
  type HoverTextAlign = 'center' | 'start' | 'end';

  /** Public inputs and trigger content for the hover bubble. */
  type Props = {
    /** Bubble text; empty or whitespace-only text suppresses the bubble. */
    text: string;
    /** Optional rich bubble content that replaces the plain text presentation while `text` remains its accessible description. */
    content?: Snippet;
    /** Preferred horizontal alignment, clamped to the viewport; defaults to center. */
    align?: HoverTextAlign;
    /** Classes for the trigger wrapper; defaults to relative inline-flex. */
    wrapperClass?: string;
    /**
     * Whether activating the trigger takes the bubble down and keeps it down
     * across the focus its activation hands away and back; defaults to false.
     *
     * For a trigger that opens a modal. Two things then go wrong that no other
     * trigger suffers: the dialog makes the trigger inert, so the
     * `pointerleave` that would close the bubble never arrives; and closing the
     * dialog returns focus to the trigger, which would put the bubble straight
     * back up over a control the pointer left long ago.
     */
    hideOnActivate?: boolean;
    /** Trigger content whose pointer hover and keyboard focus reveal the text. */
    children: Snippet;
  };

  let {
    text,
    content,
    align = 'center',
    wrapperClass = 'relative inline-flex',
    hideOnActivate = false,
    children,
  }: Props = $props();

  let rootEl = $state<HTMLElement | null>(null);
  let bubbleEl = $state<HTMLElement | null>(null);

  /** Captures the element each half of the bubble is measured against. */
  function capture(
    assign: (node: HTMLElement | null) => void,
  ): Attachment<HTMLElement> {
    return (node) => {
      assign(node);
      return () => assign(null);
    };
  }

  const captureRoot = capture((node) => (rootEl = node));
  const captureBubble = capture((node) => (bubbleEl = node));
  // `hovering` is whether the pointer is inside the trigger and `focused`
  // whether keyboard focus is asking for the bubble. The bubble is nothing
  // more than those two: it is up while the pointer is in the trigger, and it
  // is down the moment the pointer is not -- whatever was clicked in between.
  let hovering = $state(false);
  let focused = $state(false);
  let suppressFocus = $state(false);
  // Armed when an opted-in trigger is activated, and spent on the next focus it
  // receives: that focus is a closing dialog handing the trigger back, not a
  // reader asking what the control does.
  let ignoreReturnedFocus = $state(false);
  let bubbleLeft = $state(0);
  let bubbleTop = $state(0);

  const showBubble = $derived(Boolean(text.trim()) && (hovering || focused));
  // `right`/`bottom` neutralize the `inset: 0` the UA stylesheet gives a
  // popover, which would otherwise fight the measured left/top below.
  const bubbleStyle = $derived(
    `left:${bubbleLeft}px;top:${bubbleTop}px;right:auto;bottom:auto;`,
  );

  /**
   * Position the hover bubble in viewport space so clipped sidebars cannot cut
   * it off.
   *
   * This assigns `$state` from inside an effect, which is normally a smell and
   * is flagged as one by the Svelte autofixer. It is correct here and cannot
   * become a `$derived`: the position is measured from laid-out geometry via
   * `getBoundingClientRect`, which is not reactive state and is only available
   * after the browser has rendered the opened bubble.
   *
   * The preferred alignment is a parameter rather than a closure read because
   * every caller runs outside a tracking context -- a microtask and two
   * viewport listeners -- so reading `align` in here would never register as a
   * dependency of the effect that owns them.
   */
  function positionBubble(preferredAlign: HoverTextAlign): void {
    if (!rootEl || !bubbleEl || !showBubble) return;

    const viewportPadding = 8;
    const verticalGap = 8;
    const rootRect = rootEl.getBoundingClientRect();
    const bubbleRect = bubbleEl.getBoundingClientRect();
    let left = rootRect.width / 2 - bubbleRect.width / 2;

    if (preferredAlign === 'start') {
      left = 0;
    } else if (preferredAlign === 'end') {
      left = rootRect.width - bubbleRect.width;
    }

    const viewportLeft = rootRect.left + left;
    const clampedViewportLeft = Math.max(
      viewportPadding,
      Math.min(
        viewportLeft,
        window.innerWidth - bubbleRect.width - viewportPadding,
      ),
    );
    const preferredTop = rootRect.bottom + verticalGap;
    const fallbackTop = rootRect.top - bubbleRect.height - verticalGap;
    const viewportTop =
      preferredTop + bubbleRect.height <= window.innerHeight - viewportPadding
        ? preferredTop
        : Math.max(viewportPadding, fallbackTop);

    bubbleTop = Math.round(viewportTop);
    bubbleLeft = Math.round(clampedViewportLeft);
  }

  /** Show hover text for pointer hover without persisting after click-focus. */
  function handlePointerEnter(): void {
    hovering = true;
    // A pointer arriving of its own accord settles the question of whose focus
    // is whose: whatever the last activation handed away has come and gone.
    ignoreReturnedFocus = false;
  }

  /**
   * Hide hover text when the pointer leaves the trigger region -- strictly, and
   * whatever the reader did while inside it.
   *
   * Focus is cleared alongside the hover, which is what actually closes the
   * bubble after a click: activating the control moves focus into the trigger,
   * and a `focused` left standing would keep explaining a control the pointer
   * has long since left. A reader working the keyboard never sends a pointer
   * over the trigger, so this never fires on their bubble.
   */
  function handlePointerLeave(): void {
    hovering = false;
    focused = false;
  }

  /**
   * Keep the focus a click is about to place from outliving the pointer.
   *
   * The bubble itself is left alone: the pointer is still inside the trigger,
   * and text that vanishes the instant a checkbox is ticked reads as a glitch
   * rather than as an answer to the question the reader is still asking. A
   * trigger that opts into `hideOnActivate` is the exception, and takes it down
   * in `handleClick` instead.
   */
  function handlePointerDown(): void {
    suppressFocus = true;
    focused = false;
  }

  /**
   * Take the bubble down when an opted-in trigger is used, and keep it down
   * until the reader asks again.
   *
   * Both halves matter for a trigger that opens a modal. The bubble has to go
   * now, because the dialog makes this trigger inert and no `pointerleave` will
   * ever arrive to close it. And the focus the dialog returns on close has to
   * be ignored once, because it lands here without the reader having gone
   * anywhere near the control.
   */
  function handleClick(): void {
    if (!hideOnActivate) return;
    hovering = false;
    focused = false;
    ignoreReturnedFocus = true;
  }

  /** Show hover text on keyboard focus, but not after pointer-driven or returned focus. */
  function handleFocusIn(): void {
    if (ignoreReturnedFocus) {
      // Spent on the one focus the activation handed back. A later, deliberate
      // focus is the reader's own and gets its bubble.
      ignoreReturnedFocus = false;
      return;
    }
    if (suppressFocus) return;
    focused = true;
  }

  /** Clear suppressed focus state once the trigger fully loses focus. */
  function handleFocusOut(): void {
    focused = false;
    suppressFocus = false;
  }

  /** Restore focus-triggered hover text when interaction returns to the keyboard. */
  function handleKeyDown(): void {
    suppressFocus = false;
    ignoreReturnedFocus = false;
    focused = true;
  }

  $effect(() => {
    if (!showBubble || !rootEl || !bubbleEl) return;
    const bubble = bubbleEl;
    // Read here, in the effect body, so that changing the preferred alignment
    // re-runs this effect and repositions an open bubble. See positionBubble.
    const preferredAlign = align;

    // Hover text is asked for deliberately, so nothing in the app may cover it.
    // A z-index cannot promise that: the bubble is confined to whatever
    // stacking context its trigger sits in, and a sibling context later in the
    // DOM wins however high the bubble's own z-index climbs. The top layer is
    // outside that system entirely. It has to open before the bubble is
    // measured, because a closed popover is `display: none` and measures zero.
    // Where the API is missing, the `hidden` toggle and the z-50 still apply.
    //
    // The attribute is set here rather than in the markup on purpose: an engine
    // that hides `[popover]` through its UA stylesheet but ships no API to open
    // one would otherwise leave the bubble permanently invisible.
    const topLayer = typeof bubble.showPopover === 'function';
    if (topLayer) {
      bubble.setAttribute('popover', 'manual');
      try {
        bubble.showPopover();
      } catch {
        // already open
      }
    }

    // The measurement is deferred a tick, so it can outlive the effect that
    // scheduled it: hiding and re-showing the bubble quickly leaves the earlier
    // microtask queued against a torn-down run, which would then position the
    // new bubble from the previous alignment.
    let disposed = false;

    void tick().then(() => {
      if (disposed) return;
      positionBubble(preferredAlign);
    });

    const handleViewportChange = () => {
      positionBubble(preferredAlign);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      if (topLayer) {
        try {
          bubble.hidePopover();
        } catch {
          // already closed
        }
        bubble.removeAttribute('popover');
      }
    };
  });
</script>

<span
  {@attach captureRoot}
  role="presentation"
  class={wrapperClass}
  onpointerenter={handlePointerEnter}
  onpointerleave={handlePointerLeave}
  onpointerdown={handlePointerDown}
  onclick={handleClick}
  onfocusin={handleFocusIn}
  onfocusout={handleFocusOut}
  onkeydown={handleKeyDown}
>
  {@render children()}
  <span
    {@attach captureBubble}
    role="tooltip"
    aria-label={text}
    hidden={!showBubble}
    class={[
      SURFACE_BORDER_CLASS,
      SURFACE_FILL_CLASS,
      'pointer-events-none fixed z-50 m-0 w-max max-w-64 rounded-md px-2 py-1 text-xs font-medium normal-case text-slate-700 shadow-lg dark:text-slate-200',
    ]}
    style={bubbleStyle}
  >
    {#if content}
      {@render content()}
    {:else}
      {text}
    {/if}
  </span>
</span>
