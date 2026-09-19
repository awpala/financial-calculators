import { describe, expect, it } from 'vitest';
import { formatBytes } from '#lib/text/format.js';

describe('formatBytes', () => {
  it('labels byte-scale values', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('labels kilobyte-scale values', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024 KB');
  });

  it('labels megabyte-scale values with one decimal', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
