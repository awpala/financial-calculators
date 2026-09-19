import { describe, expect, it } from 'vitest';
import { extractHeadings } from '#lib/markdown/headings.js';
import { parse } from '#lib/markdown/parser.js';

describe('extractHeadings', () => {
  it('collects headings in document order with level and text', () => {
    expect(extractHeadings(parse('# One\n\n### Three\n\n## Two'))).toEqual([
      { id: 'one', level: 1, text: 'One' },
      { id: 'three', level: 3, text: 'Three' },
      { id: 'two', level: 2, text: 'Two' },
    ]);
  });

  it('flattens inline markup into plain heading text', () => {
    expect(extractHeadings(parse('# A **bold** `code`'))[0].text).toBe(
      'A bold code',
    );
  });

  it('renders hard breaks inside headings as spaces', () => {
    const doc = parse('# Line\n');
    doc.children[0] = {
      type: 'heading',
      level: 1,
      id: 'line',
      children: [
        { type: 'text', value: 'a' },
        { type: 'lineBreak' },
        { type: 'text', value: 'b' },
      ],
    };
    expect(extractHeadings(doc)[0].text).toBe('a b');
  });

  it('keeps duplicate ids unique', () => {
    expect(
      extractHeadings(parse('# Dup\n\n# Dup')).map((entry) => entry.id),
    ).toEqual(['dup', 'dup-2']);
  });

  it.each([
    ['a blockquote', '> # Quoted'],
    ['a callout', '> [!NOTE]\n> # Noted'],
    ['an article', '<article>\n# Aside\n</article>'],
  ])('descends into %s', (_label, source) => {
    expect(extractHeadings(parse(source))).toHaveLength(1);
  });

  it('descends into list items', () => {
    expect(extractHeadings(parse('- # In list\n- ## Deeper'))).toMatchObject([
      { level: 1 },
      { level: 2 },
    ]);
  });

  it('finds headings nested several levels deep', () => {
    expect(
      extractHeadings(parse('> - # Deep')).map((entry) => entry.text),
    ).toEqual(['Deep']);
  });

  it('returns an empty list when a document has no headings', () => {
    expect(extractHeadings(parse('plain text\n\n```\ncode\n```'))).toEqual([]);
  });

  it('does not descend into block kinds that cannot hold headings', () => {
    expect(extractHeadings(parse('| # A |\n| - |\n| # B |'))).toEqual([]);
  });
});
