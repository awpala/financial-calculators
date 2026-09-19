import { describe, expect, it } from 'vitest';
import { isExternalUrl, linkTargetAttributes } from '#lib/navigation/links.js';

describe('outbound link policy', () => {
  it('treats absolute and protocol-relative URLs as outbound', () => {
    expect(isExternalUrl('https://irs.gov')).toBe(true);
    expect(isExternalUrl('http://irs.gov')).toBe(true);
    expect(isExternalUrl('mailto:a@b.com')).toBe(true);
    expect(isExternalUrl('//cdn.example.com/x.png')).toBe(true);
  });

  it('keeps in-app destinations internal', () => {
    expect(isExternalUrl('#heading-1')).toBe(false);
    expect(isExternalUrl('../guides/intro')).toBe(false);
    expect(isExternalUrl('/docs/intro')).toBe(false);
    expect(isExternalUrl('')).toBe(false);
  });

  it('opens only outbound links in a new tab', () => {
    expect(linkTargetAttributes('https://irs.gov')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(linkTargetAttributes('/docs/intro')).toEqual({
      target: undefined,
      rel: undefined,
    });
  });
});
