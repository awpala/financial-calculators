import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  localScrollPositionKey,
  nearestContainedScrollTop,
  persistLocalScrollPosition,
  readLocalScrollPosition,
  writeLocalScrollPosition,
  type LocalScrollScope,
} from '#lib/state/scroll-position.js';

const listScope: LocalScrollScope = {
  userId: 'user-a',
  scopeId: 'collection-a',
  region: 'record-list',
};

function setVerticalRange(
  element: HTMLElement,
  clientHeight: number,
  scrollHeight: number,
): void {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: clientHeight },
    scrollHeight: { configurable: true, value: scrollHeight },
  });
}

describe('local scroll-position persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('computes the nearest container-local offset that fully contains an item', () => {
    expect(nearestContainedScrollTop(420, 100, 20, 36)).toBe(19);
    expect(nearestContainedScrollTop(20, 100, 130, 36)).toBe(67);
    expect(nearestContainedScrollTop(20, 100, 40, 36)).toBe(20);
    expect(nearestContainedScrollTop(41, 100, 40.5, 36)).toBe(39.5);
  });

  it('isolates positions by user, scope, and region', () => {
    const scopes = [
      listScope,
      { ...listScope, scopeId: 'collection-b' },
      { ...listScope, userId: 'user-b' },
      { ...listScope, region: 'outline' },
      { ...listScope, region: 'summary' },
    ];
    scopes.forEach((scope, index) =>
      writeLocalScrollPosition(scope, (index + 1) * 100),
    );

    expect(new Set(scopes.map(localScrollPositionKey)).size).toBe(
      scopes.length,
    );
    scopes.forEach((scope, index) =>
      expect(readLocalScrollPosition(scope)).toBe((index + 1) * 100),
    );
  });

  it.each(['not-json', '"120"', '-1', 'null', '1e999'])(
    'falls back safely for malformed or stale value %s',
    (value) => {
      localStorage.setItem(localScrollPositionKey(listScope), value);
      expect(readLocalScrollPosition(listScope)).toBeUndefined();
    },
  );

  it('restores element.scrollTop and flushes a pending vertical write on teardown', () => {
    writeLocalScrollPosition(listScope, 88);
    const element = document.createElement('div');
    setVerticalRange(element, 100, 500);
    const detach = persistLocalScrollPosition(listScope)(element);
    expect(element.scrollTop).toBe(88);

    element.scrollTop = 213;
    element.dispatchEvent(new Event('scroll'));
    detach?.();

    expect(readLocalScrollPosition(listScope)).toBe(213);
  });

  it('does not replace a useful vertical value after horizontal-only scrolling', () => {
    vi.useFakeTimers();
    const summaryScope = { ...listScope, region: 'summary' };
    writeLocalScrollPosition(summaryScope, 144);
    const element = document.createElement('div');
    setVerticalRange(element, 100, 100);
    const detach = persistLocalScrollPosition(summaryScope)(element);
    expect(element.scrollTop).toBe(144);

    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
    vi.runAllTimers();
    setVerticalRange(element, 100, 500);
    detach?.();

    expect(readLocalScrollPosition(summaryScope)).toBe(144);
  });

  it('discards a transient responsive clamp before desktop teardown', () => {
    vi.useFakeTimers();
    const summaryScope = { ...listScope, region: 'summary' };
    writeLocalScrollPosition(summaryScope, 220);
    const element = document.createElement('div');
    setVerticalRange(element, 100, 500);
    const detach = persistLocalScrollPosition(summaryScope)(element);

    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
    setVerticalRange(element, 100, 100);
    window.dispatchEvent(new Event('resize'));
    vi.runAllTimers();

    setVerticalRange(element, 100, 500);
    window.dispatchEvent(new Event('resize'));
    // Browsers dispatch this clamp event as desktop overflow returns, before
    // the resize settle callback has run.
    element.dispatchEvent(new Event('scroll'));
    expect(element.scrollTop).toBe(220);
    vi.runAllTimers();
    detach?.();

    expect(readLocalScrollPosition(summaryScope)).toBe(220);
  });

  it('restores a saved value first clamped by a non-overflowing layout', () => {
    const summaryScope = { ...listScope, region: 'summary' };
    writeLocalScrollPosition(summaryScope, 180);
    const element = document.createElement('div');
    setVerticalRange(element, 100, 100);
    const detach = persistLocalScrollPosition(summaryScope)(element);
    element.scrollTop = 0;

    setVerticalRange(element, 100, 500);
    element.dispatchEvent(new Event('scroll'));

    expect(element.scrollTop).toBe(180);
    detach?.();
  });

  it('still saves an intentional return to the top while vertically scrollable', () => {
    writeLocalScrollPosition(listScope, 144);
    const element = document.createElement('div');
    setVerticalRange(element, 100, 500);
    const detach = persistLocalScrollPosition(listScope)(element);

    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
    detach?.();

    expect(readLocalScrollPosition(listScope)).toBe(0);
  });

  it('ignores invalid writes without replacing a usable value', () => {
    writeLocalScrollPosition(listScope, 88);
    writeLocalScrollPosition(listScope, Number.NaN);
    writeLocalScrollPosition(listScope, -10);

    expect(readLocalScrollPosition(listScope)).toBe(88);
  });
});
