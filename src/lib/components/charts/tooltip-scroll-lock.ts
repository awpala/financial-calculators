/**
 * Wheel- and keyboard-scroll lock for active tooltips.
 *
 * Phantom-scroll-behind-a-card has two triggers: mouse wheel events, and
 * keyboard scroll keys (Arrows, PageUp/PageDown, Home/End, Space). This
 * module installs capture-phase listeners for both and only prevents events
 * when a tooltip is active AND the event isn't targeted at a registered
 * tooltip-internal scroll surface (or a form input, for keys).
 *
 * Importantly, this does NOT touch CSS overflow, scrollbars, or scroll
 * position. The scrollbar stays visible; click-drag of the scrollbar still
 * works; trackpad-drag still works. Only wheel and the scroll keys are
 * gated, and only while a tooltip is up.
 *
 * The counters below are module scope, which on the server means one shared
 * copy across every request. Both entry points therefore no-op outside the
 * browser rather than accumulating request state into the process.
 */

import { browser } from '$app/env';

let activeCount = 0;
const allowedScrollers = new Set<HTMLElement>();
let listenersAttached = false;

const noop = () => {};

/**
 * Drops surfaces that have left the document. A surface whose component was
 * torn down without its unregister running would otherwise pin its whole
 * subtree here for the life of the page. Runs on every gated event, so it is
 * self-healing rather than dependent on what the event happened to target.
 */
function evictDetachedScrollers(): void {
  for (const el of allowedScrollers) {
    if (!el.isConnected) allowedScrollers.delete(el);
  }
}

function isInsideAllowedScroller(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  for (const el of allowedScrollers) {
    if (el.contains(target)) return true;
  }
  return false;
}

function onWheel(event: WheelEvent): void {
  if (activeCount === 0) return;
  evictDetachedScrollers();
  if (isInsideAllowedScroller(event.target)) return;
  event.preventDefault();
}

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function onKey(event: KeyboardEvent): void {
  if (activeCount === 0) return;
  if (!SCROLL_KEYS.has(event.key)) return;
  if (isEditableTarget(event.target)) return;
  evictDetachedScrollers();
  if (isInsideAllowedScroller(event.target)) return;
  event.preventDefault();
}

// Passed by reference to both add and remove so the capture flags match.
const WHEEL_OPTIONS = { capture: true, passive: false } as const;
const KEY_OPTIONS = { capture: true } as const;

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener('wheel', onWheel, WHEEL_OPTIONS);
  window.addEventListener('keydown', onKey, KEY_OPTIONS);
  window.addEventListener('keyup', onKey, KEY_OPTIONS);
}

function detachListeners(): void {
  if (!listenersAttached) return;
  listenersAttached = false;
  window.removeEventListener('wheel', onWheel, WHEEL_OPTIONS);
  window.removeEventListener('keydown', onKey, KEY_OPTIONS);
  window.removeEventListener('keyup', onKey, KEY_OPTIONS);
}

/**
 * Activate the wheel lock. Returns a release function; only when every
 * release has fired does the wheel resume working outside registered
 * surfaces. The listeners exist only while at least one lock is held — a
 * non-passive capture-phase wheel handler is not free to leave on window.
 */
export function activateTooltipLock(): () => void {
  if (!browser) return noop;
  activeCount++;
  attachListeners();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount === 0) detachListeners();
  };
}

/**
 * Mark an element as a permitted wheel-scroll surface while a tooltip is
 * active. Returns an unregister function; calling it is the caller's job,
 * but a surface detached from the document is dropped anyway on the next
 * event that walks the set.
 */
export function registerTooltipScroller(el: HTMLElement): () => void {
  if (!browser) return noop;
  allowedScrollers.add(el);
  return () => {
    allowedScrollers.delete(el);
  };
}
