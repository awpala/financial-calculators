/**
 * HoverController centralizes the "show a tooltip on chart hover, but keep it
 * alive while the user moves the cursor into the tooltip itself" pattern.
 *
 * The chart calls `set(info)` on enter and `set(null)` on leave. When set to
 * null we defer the actual close by `delayMs` so the user can bridge the gap
 * between the chart element and the tooltip. The tooltip itself wires its own
 * pointerenter → `keepAlive()` and pointerleave → `close()`.
 */
export class HoverController<T> {
  #current = $state<T | null>(null);
  #timer: ReturnType<typeof setTimeout> | null = null;
  #delayMs: number;

  /** Create an instance-owned hover delay in milliseconds; defaults to 180. */
  constructor(delayMs = 180) {
    this.#delayMs = delayMs;
  }

  /** Current tooltip payload, or null when no hover is active. */
  get current(): T | null {
    return this.#current;
  }

  /** Show a payload immediately, or schedule dismissal when passed null. */
  set(info: T | null): void {
    this.#clearTimer();
    if (info !== null) {
      this.#current = info;
      return;
    }
    this.#timer = setTimeout(() => {
      this.#current = null;
      this.#timer = null;
    }, this.#delayMs);
  }

  /** Cancel pending dismissal while the pointer is inside the tooltip. */
  keepAlive(): void {
    this.#clearTimer();
  }

  /** Cancel pending dismissal and clear the tooltip immediately. */
  close(): void {
    this.#clearTimer();
    this.#current = null;
  }

  /**
   * Cancel any pending dismissal timer and drop the current hover. Call
   * from a Svelte `$effect` cleanup so a controller created at component
   * scope doesn't hold a deferred-close timer alive past unmount.
   */
  destroy(): void {
    this.close();
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
