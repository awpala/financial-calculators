import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverController } from '#lib/components/charts/hover-controller.svelte.js';

describe('hover payload ownership', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([0, false, ''])(
    'keeps the valid falsy payload %j until explicit dismissal',
    (payload) => {
      const hover = new HoverController<number | boolean | string>(20);
      hover.set(payload);
      expect(hover.current).toBe(payload);
      vi.advanceTimersByTime(100);
      expect(hover.current).toBe(payload);

      hover.set(null);
      vi.advanceTimersByTime(19);
      expect(hover.current).toBe(payload);
      vi.advanceTimersByTime(1);
      expect(hover.current).toBeNull();
      hover.destroy();
    },
  );

  it('cancels delayed closure for a replacement payload and releases its timer on teardown', () => {
    const hover = new HoverController<number>(20);
    hover.set(1);
    hover.set(null);
    hover.set(0);
    vi.advanceTimersByTime(20);
    expect(hover.current).toBe(0);

    hover.set(null);
    hover.keepAlive();
    vi.advanceTimersByTime(20);
    expect(hover.current).toBe(0);
    hover.set(null);
    hover.destroy();
    expect(hover.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
