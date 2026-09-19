import { browser } from '$app/env';
import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { USER_SCOPED_STORAGE, userScopedKey } from '#lib/state/storage-keys.js';

/** Account and content scope that owns a persisted element-local scroll position. */
export type LocalScrollScope = {
  /** Account identifier that isolates browser storage; empty selects anonymous. */
  userId: string;
  /** Caller-owned content identity whose position is restored. */
  scopeId: string;
  /** Distinguishes independent scrolling regions within the scope. */
  region: string;
};

/** Reveal an item inside its scroll region without scrolling any ancestor or scheduling work. */
export function revealContainedItem(
  element: HTMLElement,
  item: HTMLElement,
): void {
  const containerBounds = element.getBoundingClientRect();
  const itemBounds = item.getBoundingClientRect();
  if (element.clientHeight <= 0 || itemBounds.height <= 0) return;
  const nextScrollTop = nearestContainedScrollTop(
    element.scrollTop,
    element.clientHeight,
    element.scrollTop + itemBounds.top - containerBounds.top,
    itemBounds.height,
  );
  if (nextScrollTop !== element.scrollTop) element.scrollTop = nextScrollTop;
}

/**
 * Return the nearest non-negative local offset that reveals an item's edge.
 * The default safety inset is one pixel; items taller than the viewport cannot
 * be fully contained. Callers supply finite geometry in one coordinate system.
 */
export function nearestContainedScrollTop(
  scrollTop: number,
  clientHeight: number,
  itemTop: number,
  itemHeight: number,
  safetyInset = 1,
): number {
  if (itemTop < scrollTop + safetyInset) {
    return Math.max(0, itemTop - safetyInset);
  }
  const itemBottom = itemTop + itemHeight;
  const viewportBottom = scrollTop + clientHeight - safetyInset;
  return itemBottom > viewportBottom
    ? Math.max(0, itemBottom - clientHeight + safetyInset)
    : scrollTop;
}

/** Optional timing and post-restore behavior for one scroll attachment. */
export type LocalScrollOptions = {
  /** Debounce and resize-settling delay in milliseconds; defaults to 150. */
  delayMs?: number;
  /**
   * Called after the initial restoration attempt, even when no value was saved.
   * Runs without reactive dependency tracking; the caller owns any added work.
   */
  onRestore?: (element: HTMLElement, saved: number | undefined) => void;
};

/** Return the browser-only key for one user's scrollable region and scope. */
export function localScrollPositionKey({
  userId,
  scopeId,
  region,
}: LocalScrollScope): string {
  const owner = userScopedKey(USER_SCOPED_STORAGE.localScrollPosition, userId);
  return `${owner}:${encodeURIComponent(scopeId)}:${encodeURIComponent(region)}`;
}

/**
 * Read a finite offset in [0, Number.MAX_SAFE_INTEGER], or undefined for missing,
 * invalid, inaccessible, or server-side storage. Stored fractions remain valid.
 */
export function readLocalScrollPosition(
  scope: LocalScrollScope,
): number | undefined {
  if (!browser) return undefined;
  try {
    const raw = localStorage.getItem(localScrollPositionKey(scope));
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= Number.MAX_SAFE_INTEGER
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Round and save an offset in [0, Number.MAX_SAFE_INTEGER] best-effort.
 * Invalid input, server execution, and unavailable storage are no-ops.
 */
export function writeLocalScrollPosition(
  scope: LocalScrollScope,
  scrollTop: number,
): void {
  if (
    !browser ||
    !Number.isFinite(scrollTop) ||
    scrollTop < 0 ||
    scrollTop > Number.MAX_SAFE_INTEGER
  ) {
    return;
  }
  try {
    localStorage.setItem(
      localScrollPositionKey(scope),
      JSON.stringify(Math.round(scrollTop)),
    );
  } catch {
    // Storage can be denied or full; scrolling remains functional in memory.
  }
}

/**
 * Persist an element's own `scrollTop` with debounced writes and teardown flush.
 *
 * Recreating the attachment for a user, scope, or region change flushes the old
 * element before restoring the new one. It never reads page, viewport, or
 * bounding-box coordinates. Stale values beyond current content are safely
 * clamped by the browser. Callers choose distinct regions and scope IDs; for
 * example, desktop and mobile instances can intentionally share one region.
 * Each attachment owns its listeners, optional observer, and debounce timers;
 * its returned cleanup removes them and flushes the final pending offset.
 */
export function persistLocalScrollPosition(
  scope: LocalScrollScope,
  { delayMs = 150, onRestore }: LocalScrollOptions = {},
): Attachment<HTMLElement> {
  return (element) => {
    const saved = readLocalScrollPosition(scope);
    if (saved !== undefined) element.scrollTop = saved;
    untrack(() => onRestore?.(element, saved));

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let lastVerticalScrollTop = saved ?? element.scrollTop;
    let pendingScrollTop: number | undefined;
    let hadVerticalOverflow = element.scrollHeight > element.clientHeight;

    const clearPending = () => {
      pendingScrollTop = undefined;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = undefined;
      }
    };
    const reconcileOverflow = (): boolean => {
      const hasVerticalOverflow = element.scrollHeight > element.clientHeight;
      if (!hasVerticalOverflow) {
        clearPending();
      } else if (
        !hadVerticalOverflow &&
        element.scrollTop === 0 &&
        lastVerticalScrollTop > 0
      ) {
        clearPending();
        element.scrollTop = lastVerticalScrollTop;
      }
      hadVerticalOverflow = hasVerticalOverflow;
      return hasVerticalOverflow;
    };
    const flush = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = undefined;
      }
      if (!reconcileOverflow()) return;
      if (pendingScrollTop !== undefined) {
        lastVerticalScrollTop = pendingScrollTop;
        pendingScrollTop = undefined;
      }
      writeLocalScrollPosition(scope, lastVerticalScrollTop);
    };
    const schedule = () => {
      if (!reconcileOverflow()) return;
      pendingScrollTop = element.scrollTop;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, delayMs);
    };
    const scheduleOverflowReconciliation = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      // Responsive descendants can change scrollHeight without changing this
      // element's observed box. Re-check after the layout has settled so a
      // later false -> true overflow transition can restore a clamped offset.
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        reconcileOverflow();
      }, delayMs);
    };

    element.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', scheduleOverflowReconciliation, {
      passive: true,
    });
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => reconcileOverflow());
    resizeObserver?.observe(element);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleOverflowReconciliation);
      if (resizeTimer) clearTimeout(resizeTimer);
      element.removeEventListener('scroll', schedule);
      flush();
    };
  };
}
