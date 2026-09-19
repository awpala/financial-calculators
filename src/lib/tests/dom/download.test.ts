import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OBJECT_URL_LIFETIME_MS, saveFile } from '#lib/dom/download.js';

describe('saving a file', () => {
  const createObjectURL = vi.fn(() => 'blob:synthetic');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = createObjectURL;
        static override revokeObjectURL = revokeObjectURL;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('follows a download link to the file, then removes the link', () => {
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
      expect(this.isConnected).toBe(true);
    });
    const blob = new Blob(['# Synthetic']);

    saveFile(blob, 'report.md');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.getAttribute('href')).toBe('blob:synthetic');
    expect(clicks[0]?.download).toBe('report.md');
    expect(clicks[0]?.isConnected).toBe(false);
  });

  // Revoking at once can cancel a download the browser has not begun reading;
  // never revoking would hold the blob for the life of the page.
  it('releases the object URL only after the download has had time to start', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    saveFile(new Blob(['x']), 'report.md');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OBJECT_URL_LIFETIME_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
  });

  it('still cleans up when the click throws', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => saveFile(new Blob(['x']), 'report.md')).toThrow('blocked');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(OBJECT_URL_LIFETIME_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
  });

  it('releases the URL when appending the link throws', () => {
    vi.spyOn(document.body, 'append').mockImplementation(() => {
      throw new Error('append blocked');
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    expect(() => saveFile(new Blob(['x']), 'report.md')).toThrow(
      'append blocked',
    );
    expect(click).not.toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(OBJECT_URL_LIFETIME_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
  });
});
