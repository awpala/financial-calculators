import { flushSync, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPopupHarness } from './popup-harness.svelte.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
});

describe('popup element ownership', () => {
  it('typesets each renderer own popup and distinguishes identical trigger tokens', async () => {
    const firstMath = {
      typesetElement: vi.fn().mockResolvedValue(undefined),
      clearElement: vi.fn(),
    };
    const secondMath = {
      typesetElement: vi.fn().mockResolvedValue(undefined),
      clearElement: vi.fn(),
    };
    const first = createPopupHarness(firstMath);
    const second = createPopupHarness(secondMath);
    cleanups.push(first.destroy, second.destroy);
    const firstPopup = document.createElement('div');
    const secondPopup = document.createElement('div');
    const firstAnchor = document.createElement('button');
    const secondAnchor = document.createElement('button');
    firstPopup.dataset.popup = '';
    secondPopup.dataset.popup = '';
    firstAnchor.dataset.popupToken = 'root.0';
    secondAnchor.dataset.popupToken = 'root.0';
    document.body.append(firstPopup, secondPopup, firstAnchor, secondAnchor);
    const detachFirst = first.controller.attachPopup(firstPopup);
    const detachSecond = second.controller.attachPopup(secondPopup);
    if (detachFirst) cleanups.push(detachFirst);
    if (detachSecond) cleanups.push(detachSecond);
    const source = {
      kind: 'definition' as const,
      term: 'Term',
      definition: [],
    };
    first.controller.togglePopup('root.0', source, firstAnchor);
    second.controller.togglePopup('root.0', source, secondAnchor);
    flushSync();
    await tick();
    await vi.waitFor(() => {
      expect(firstMath.typesetElement).toHaveBeenCalledWith(firstPopup);
      expect(secondMath.typesetElement).toHaveBeenCalledWith(secondPopup);
    });

    secondAnchor.click();
    expect(first.controller.activePopupContent).toBeNull();
    expect(second.controller.activePopupContent).not.toBeNull();
  });

  it('keeps readable content when optional math rejects and clears it on detach', async () => {
    const math = {
      typesetElement: vi.fn().mockRejectedValue(new Error('unavailable')),
      clearElement: vi.fn(),
    };
    const owner = createPopupHarness(math);
    cleanups.push(owner.destroy);
    const popup = document.createElement('div');
    const anchor = document.createElement('button');
    document.body.append(popup, anchor);
    const detach = owner.controller.attachPopup(popup);
    owner.controller.togglePopup(
      'root.0',
      { kind: 'definition', term: 'Visible', definition: [] },
      anchor,
    );
    flushSync();
    await tick();
    await Promise.resolve();
    expect(owner.controller.activePopupContent?.heading).toBe('Visible');
    detach?.();
    expect(math.clearElement).toHaveBeenCalledWith(popup);
  });
});
