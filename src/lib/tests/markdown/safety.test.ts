import { describe, expect, it } from 'vitest';
import { parse } from '#lib/markdown/parser.js';
import { safeLinkHref } from '#lib/navigation/links.js';

describe('authored markdown safety', () => {
  it('removes executable table markup after template and markdown expansion', () => {
    const doc = parse(`<table><tr><td onclick="alert(1)">
<script>alert(1)</script><iframe srcdoc="unsafe"></iframe>
<img src="x" onerror="alert(1)">
<a href="java&#x73;cript:alert(1)" target="_blank" rel="opener">unsafe</a>
<span class="fixed inset-0" style="position:fixed;color:#00b050">**safe text**</span>
</td></tr></table>`);
    const node = doc.children[0];
    if (node.type !== 'htmlTable') throw new Error('Expected HTML table');
    const root = document.createElement('div');
    root.innerHTML = node.html;
    expect(root.querySelector('script,iframe')).toBeNull();
    expect(root.querySelector('[onclick],[onerror]')).toBeNull();
    expect(root.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(root.querySelector('a')?.relList.contains('opener')).toBe(false);
    expect(root.querySelector('span')?.className).toBe('');
    expect(root.querySelector('span')?.style.position).toBe('');
    expect(root.querySelector('strong')?.textContent).toBe('safe text');
  });

  it.each([
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,unsafe',
    'vbscript:msgbox(1)',
  ])('makes an unsafe authored link inert: %s', (href) =>
    expect(safeLinkHref(href)).toBe('#'),
  );

  it.each([
    'https://example.com',
    '/items',
    '../intro',
    '#section',
    'mailto:a@example.com',
  ])('preserves an allowed authored link: %s', (href) =>
    expect(safeLinkHref(href)).toBe(href),
  );
});
