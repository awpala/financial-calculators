import { describe, expect, it } from 'vitest';
import { parse } from '#lib/markdown/parser.js';
import type { BlockNode } from '#lib/markdown/types.js';

/** Narrow a document child to a specific block kind. */
function blockAt<K extends BlockNode['type']>(
  doc: { children: BlockNode[] },
  index: number,
  type: K,
): Extract<BlockNode, { type: K }> {
  const node = doc.children[index];
  expect(node.type).toBe(type);
  return node as Extract<BlockNode, { type: K }>;
}

describe('document normalization', () => {
  it('normalizes CRLF and CR line endings', () => {
    expect(parse('a\r\n\r\nb\rc').children).toMatchObject([
      { type: 'paragraph', children: [{ type: 'text', value: 'a' }] },
      { type: 'paragraph' },
    ]);
  });

  it('drops standalone HTML comments at the top level', () => {
    const doc = parse('<!-- hidden -->\n\nvisible');
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0]).toMatchObject({ type: 'paragraph' });
  });

  it('keeps HTML comments that are nested inside another block', () => {
    const quote = blockAt(parse('> <!-- kept -->'), 0, 'blockquote');
    expect(quote.children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'text', value: '<!-- kept -->' }],
    });
  });

  it('ignores blank lines between blocks', () => {
    expect(parse('\n\n\na\n\n\n\nb\n\n').children).toHaveLength(2);
  });
});

describe('headings', () => {
  it('attaches an extra-content decorator to the following heading only', () => {
    const doc = parse(
      '<!-- data-is-extra-content="true" -->\n\n### **Practice**\n\nBody\n\n### Core',
    );
    expect(doc.children).toHaveLength(3);
    expect(blockAt(doc, 0, 'heading')).toMatchObject({
      id: 'practice',
      isExtraContent: true,
      children: [{ type: 'bold' }],
    });
    expect(blockAt(doc, 2, 'heading').isExtraContent).toBeUndefined();
  });

  it('separates a decorator from a preceding paragraph without a blank line', () => {
    const doc = parse('Core\n<!-- data-is-extra-content="true" -->\n## Extra');
    expect(doc.children).toHaveLength(2);
    expect(blockAt(doc, 0, 'paragraph').children).toEqual([
      { type: 'text', value: 'Core' },
    ]);
    expect(blockAt(doc, 1, 'heading').isExtraContent).toBe(true);
  });

  it('recognizes decorators in nested blocks with whitespace and single quotes', () => {
    const doc = parse(
      "> <!-- data-is-extra-content = 'true' -->\n> ## Practice\n> Body",
    );
    expect(blockAt(doc, 0, 'blockquote').children[0]).toMatchObject({
      type: 'heading',
      isExtraContent: true,
    });
  });

  it('does not carry a decorator past unrelated content', () => {
    for (const content of [
      'Paragraph',
      '---',
      '- List item',
      '```\ncode\n```',
    ]) {
      const doc = parse(
        `<!-- data-is-extra-content="true" -->\n${content}\n\n## Core`,
      );
      expect(doc.children.at(-1)).toMatchObject({ type: 'heading' });
      expect(doc.children.at(-1)).not.toHaveProperty('isExtraContent');
    }
  });

  it('ignores false decorators, orphan decorators, and examples in fenced code', () => {
    const doc = parse(
      '<!-- data-is-extra-content="false" -->\n## Core\n\n```md\n<!-- data-is-extra-content="true" -->\n## Example\n```\n\n## More\n\n<!-- data-is-extra-content="true" -->',
    );
    expect(doc.children).toHaveLength(3);
    expect(blockAt(doc, 0, 'heading').isExtraContent).toBeUndefined();
    expect(blockAt(doc, 1, 'codeBlock').value).toContain(
      'data-is-extra-content',
    );
    expect(blockAt(doc, 2, 'heading').isExtraContent).toBeUndefined();
  });

  it('parses all six levels with slugified ids', () => {
    const doc = parse(
      '# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six',
    );
    expect(
      doc.children.map((node) => (node as { level: number }).level),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(blockAt(doc, 0, 'heading').id).toBe('one');
  });

  it('falls back to a generic id when a heading slugifies to nothing', () => {
    expect(blockAt(parse('# ***'), 0, 'heading').id).toBe('section');
  });

  it('strips punctuation and collapses separators in ids', () => {
    expect(blockAt(parse('# A, B -- C!'), 0, 'heading').id).toBe('a-b-c');
  });

  it('suffixes duplicate ids', () => {
    const doc = parse('# Dup\n\n# Dup\n\n# Dup');
    expect(doc.children.map((node) => (node as { id: string }).id)).toEqual([
      'dup',
      'dup-2',
      'dup-3',
    ]);
  });

  it('parses inline content inside headings', () => {
    expect(blockAt(parse('## A **b**'), 0, 'heading').children).toMatchObject([
      { type: 'text', value: 'A ' },
      { type: 'bold' },
    ]);
  });

  it('requires whitespace after the hash run', () => {
    expect(parse('#NotAHeading').children[0].type).toBe('paragraph');
    expect(parse('####### Seven').children[0].type).toBe('paragraph');
  });
});

describe('thematic breaks', () => {
  it('parses dash and equals rules, including spaced markers', () => {
    const doc = parse('a\n\n---\n\nb\n\n===\n\nc\n\n= = =');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'thematicBreak',
      'paragraph',
      'thematicBreak',
      'paragraph',
      'thematicBreak',
    ]);
  });

  it('prefers a list over a thematic break for spaced dashes', () => {
    expect(parse('- - -').children[0].type).toBe('list');
  });

  it('requires at least three markers', () => {
    expect(parse('a\n\n--').children[1].type).toBe('paragraph');
  });
});

describe('fenced code blocks', () => {
  it('parses backtick and tilde fences with language info', () => {
    const doc = parse('```ts\nconst a = 1;\n```\n\n~~~PY\nx = 1\n~~~');
    expect(blockAt(doc, 0, 'codeBlock')).toMatchObject({
      language: 'ts',
      value: 'const a = 1;',
    });
    expect(blockAt(doc, 1, 'codeBlock')).toMatchObject({
      language: 'py',
      value: 'x = 1',
    });
  });

  it('uses the first info word and null for a bare fence', () => {
    expect(
      blockAt(parse('```js title=x\ncode\n```'), 0, 'codeBlock').language,
    ).toBe('js');
    expect(
      blockAt(parse('```\ncode\n```'), 0, 'codeBlock').language,
    ).toBeNull();
  });

  it('only closes on a fence at least as long as the opener', () => {
    const doc = parse('````\n```\ninner\n````');
    expect(blockAt(doc, 0, 'codeBlock').value).toBe('```\ninner');
  });

  it('does not close on a fence followed by other text', () => {
    expect(blockAt(parse('```\na\n``` tail\n```'), 0, 'codeBlock').value).toBe(
      'a\n``` tail',
    );
  });

  it('runs an unclosed fence to the end of the document', () => {
    expect(blockAt(parse('```\na\nb'), 0, 'codeBlock').value).toBe('a\nb');
  });

  it('accepts an opening fence indented up to three spaces', () => {
    expect(blockAt(parse('   ```\nx\n   ```'), 0, 'codeBlock').value).toBe('x');
  });

  it('ignores runs shorter than three fence characters', () => {
    expect(parse('``\nnot code\n``').children[0].type).toBe('paragraph');
  });
});

describe('math blocks', () => {
  it('parses a single-line display math block', () => {
    expect(blockAt(parse('$$x = 1$$'), 0, 'mathBlock').value).toBe('x = 1');
  });

  it('parses a delimited multi-line block', () => {
    expect(blockAt(parse('$$\na\nb\n$$'), 0, 'mathBlock').value).toBe('a\nb');
  });

  it('parses content that starts on the opening line', () => {
    expect(blockAt(parse('$$a\nb\n$$'), 0, 'mathBlock').value).toBe('a\nb');
  });

  it('parses content that ends on the closing line', () => {
    expect(blockAt(parse('$$\na\nb$$'), 0, 'mathBlock').value).toBe('a\nb');
  });

  it('handles an unterminated block and an empty block', () => {
    expect(blockAt(parse('$$\na'), 0, 'mathBlock').value).toBe('a');
    expect(blockAt(parse('$$\n$$'), 0, 'mathBlock').value).toBe('');
  });

  it('stops a math block when indentation falls below the block indent', () => {
    const list = blockAt(parse('- item\n  $$\n  a\nback'), 0, 'list');
    const math = list.items[0].children.find((n) => n.type === 'mathBlock');
    expect(math).toMatchObject({ type: 'mathBlock', value: 'a' });
  });
});

describe('blockquotes and callouts', () => {
  it('parses a blockquote with nested blocks', () => {
    const quote = blockAt(parse('> # Title\n> body'), 0, 'blockquote');
    expect(quote.children.map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
    ]);
  });

  it('accepts quote markers without a following space', () => {
    expect(blockAt(parse('>tight'), 0, 'blockquote').children[0]).toMatchObject(
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'tight' }],
      },
    );
  });

  it('parses every callout kind case-insensitively', () => {
    const kinds = ['NOTE', 'IMPORTANT', 'WARNING', 'CAUTION', 'tip'];
    for (const kind of kinds) {
      const doc = parse(`> [!${kind}]\n> body`);
      expect(blockAt(doc, 0, 'callout')).toMatchObject({
        kind: kind.toLowerCase(),
        children: [{ type: 'paragraph' }],
      });
    }
  });

  it('splits successive callouts separated by a blank line', () => {
    const doc = parse('> [!NOTE]\n> first\n\n> [!TIP]\n> second');
    expect(doc.children.map((node) => node.type)).toEqual([
      'callout',
      'callout',
    ]);
  });

  it('keeps a blank line inside one callout when no callout follows', () => {
    const doc = parse('> [!NOTE]\n> first\n\n> still the note');
    expect(doc.children).toHaveLength(1);
    expect(blockAt(doc, 0, 'callout').children).toHaveLength(2);
  });

  it('does not split a plain blockquote on a blank line', () => {
    const doc = parse('> a\n\n> b');
    expect(doc.children).toHaveLength(1);
    expect(blockAt(doc, 0, 'blockquote').children).toHaveLength(2);
  });

  it('ends a quote when the document ends after a blank line', () => {
    const doc = parse('> [!NOTE]\n> body\n\n');
    expect(doc.children).toHaveLength(1);
  });

  it('ends a quote when a non-quote line follows a blank line', () => {
    const doc = parse('> [!NOTE]\n> body\n\nplain');
    expect(doc.children.map((node) => node.type)).toEqual([
      'callout',
      'paragraph',
    ]);
  });

  it('parses an indented blockquote inside a list item', () => {
    const list = blockAt(parse('- item\n  > quoted'), 0, 'list');
    expect(list.items[0].children.map((node) => node.type)).toEqual([
      'paragraph',
      'blockquote',
    ]);
  });
});

describe('lists', () => {
  it('parses each unordered marker', () => {
    for (const marker of ['-', '*', '+']) {
      const list = blockAt(parse(`${marker} a\n${marker} b`), 0, 'list');
      expect(list.ordered).toBe(false);
      expect(list.items).toHaveLength(2);
    }
  });

  it('records ordered marker kind and start value', () => {
    expect(blockAt(parse('3. a\n4. b'), 0, 'list')).toMatchObject({
      ordered: true,
      markerKind: 'decimal',
      start: 3,
    });
    expect(blockAt(parse('b) a'), 0, 'list')).toMatchObject({
      markerKind: 'lower-alpha',
      start: 2,
    });
    expect(blockAt(parse('B) a'), 0, 'list')).toMatchObject({
      markerKind: 'upper-alpha',
      start: 2,
    });
  });

  it('starts a new list when the ordered marker kind changes', () => {
    const doc = parse('1. one\na. two');
    expect(doc.children.map((node) => node.type)).toEqual(['list', 'list']);
    expect(blockAt(doc, 1, 'list').markerKind).toBe('lower-alpha');
  });

  it('starts a new list when ordering changes', () => {
    const doc = parse('- a\n1. b');
    expect(
      doc.children.map((n) => (n as { ordered: boolean }).ordered),
    ).toEqual([false, true]);
  });

  it('nests lists by indentation', () => {
    const list = blockAt(parse('- top\n  - nested\n    - deep'), 0, 'list');
    const nested = list.items[0].children[1];
    expect(nested).toMatchObject({ type: 'list' });
    expect(
      (nested as Extract<BlockNode, { type: 'list' }>).items[0].children[1],
    ).toMatchObject({ type: 'list' });
  });

  it('keeps multi-paragraph list items together across blank lines', () => {
    const list = blockAt(parse('- first\n\n  second\n\n- next'), 0, 'list');
    expect(list.items).toHaveLength(2);
    expect(list.items[0].children).toHaveLength(2);
  });

  it('gives an empty list item an empty paragraph', () => {
    const list = blockAt(parse('- \n- b'), 0, 'list');
    expect(list.items[0].children).toEqual([
      { type: 'paragraph', children: [] },
    ]);
  });

  it('nests a tab-indented list item', () => {
    const list = blockAt(parse('- top\n\t- nested'), 0, 'list');
    expect(list.items[0].children[1]).toMatchObject({ type: 'list' });
  });

  it('nests a four-space-indented list item', () => {
    const list = blockAt(parse('- top\n    - nested'), 0, 'list');
    expect(list.items[0].children[1]).toMatchObject({ type: 'list' });
  });

  it('ends a list when a less-indented line follows', () => {
    const doc = parse('  - indented\nflush');
    expect(doc.children.map((node) => node.type)).toEqual([
      'list',
      'paragraph',
    ]);
  });

  it('breaks a paragraph when a list starts on the next line', () => {
    const doc = parse('intro\n- a');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'list',
    ]);
  });
});

describe('footnote definitions', () => {
  it('parses an inline definition body', () => {
    const note = blockAt(parse('[^a]: text'), 0, 'footnoteDefinition');
    expect(note).toMatchObject({
      id: 'a',
      children: [{ type: 'paragraph' }],
    });
  });

  it('collects quote-prefixed continuation lines', () => {
    const note = blockAt(
      parse('[^a]: first\n> second\n> third'),
      0,
      'footnoteDefinition',
    );
    expect(note.children).toHaveLength(1);
    expect(note.children[0]).toMatchObject({ type: 'paragraph' });
  });

  it('supports a definition whose body starts on the continuation line', () => {
    const note = blockAt(parse('[^a]:\n> body'), 0, 'footnoteDefinition');
    expect(note.children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'text', value: 'body' }],
    });
  });

  it('produces no children for an empty definition', () => {
    expect(
      blockAt(parse('[^a]:\n\nafter'), 0, 'footnoteDefinition').children,
    ).toEqual([]);
  });

  it('stops collecting at a line that is not a quote continuation', () => {
    const doc = parse('[^a]: note\nplain text');
    expect(doc.children.map((node) => node.type)).toEqual([
      'footnoteDefinition',
      'paragraph',
    ]);
  });

  it('stops collecting at a blank line or a non-quote line', () => {
    const doc = parse('[^a]: first\n> second\n\nplain');
    expect(doc.children.map((node) => node.type)).toEqual([
      'footnoteDefinition',
      'paragraph',
    ]);
  });

  it('breaks a paragraph when a footnote definition follows', () => {
    const doc = parse('intro\n[^a]: note');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'footnoteDefinition',
    ]);
  });
});

describe('article blocks', () => {
  it('parses data attributes and nested content', () => {
    const doc = parse(
      '<article data-color="#638d1b" data-kind=\'box\' data-flag=x>\n# Inner\n</article>',
    );
    const article = blockAt(doc, 0, 'asideArticle');
    expect(article.dataAttributes).toEqual({
      'data-color': '#638d1b',
      'data-kind': 'box',
      'data-flag': 'x',
    });
    expect(article.children[0]).toMatchObject({ type: 'heading' });
  });

  it('balances nested article tags', () => {
    const doc = parse(
      '<article>\nouter\n<article>\ninner\n</article>\n</article>',
    );
    const outer = blockAt(doc, 0, 'asideArticle');
    expect(outer.children.map((node) => node.type)).toEqual([
      'paragraph',
      'asideArticle',
    ]);
  });

  it('runs an unclosed article to the end of the document', () => {
    const article = blockAt(parse('<article>\nbody'), 0, 'asideArticle');
    expect(article.children).toHaveLength(1);
  });

  it('parses an indented article inside a list item', () => {
    const list = blockAt(
      parse('- item\n  <article>\n  x\n  </article>'),
      0,
      'list',
    );
    expect(
      list.items[0].children.some((node) => node.type === 'asideArticle'),
    ).toBe(true);
  });

  it('breaks a paragraph when an article opens on the next line', () => {
    const doc = parse('intro\n<article>\nbody\n</article>');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'asideArticle',
    ]);
  });
});

describe('center blocks, captions, and figures', () => {
  it('converts a centered image tag into an image paragraph', () => {
    const doc = parse('<center><img src="a.png" alt="A" width="300"></center>');
    expect(blockAt(doc, 0, 'paragraph').children).toEqual([
      { type: 'image', alt: 'A', url: 'a.png', maxWidthPx: 300 },
    ]);
  });

  it('defaults alt text and omits an unusable width', () => {
    const doc = parse('<center><img src="a.png" width="auto"></center>');
    expect(blockAt(doc, 0, 'paragraph').children).toEqual([
      { type: 'image', alt: '', url: 'a.png' },
    ]);
  });

  it('centers markdown content in a bare center block', () => {
    const doc = parse('<center>\n**bold**\n</center>');
    expect(blockAt(doc, 0, 'paragraph')).toMatchObject({ centered: true });
  });

  it('leaves a center block without a usable image source as text', () => {
    const doc = parse('<center><img alt="no src"></center>');
    expect(doc.children[0].type).toBe('paragraph');
    expect(blockAt(doc, 0, 'paragraph').centered).toBeUndefined();
  });

  it('does not treat an unclosed center tag as a center block', () => {
    expect(parse('<center>\nnever closed').children[0].type).toBe('paragraph');
  });

  it('pairs a standalone image with a following caption as a figure', () => {
    const doc = parse('![A](a.png)\n\n<caption>Figure 1</caption>');
    expect(blockAt(doc, 0, 'figure')).toMatchObject({
      image: { type: 'image', url: 'a.png' },
      caption: [{ type: 'paragraph' }],
    });
  });

  it('replaces the caption when a second caption follows a figure', () => {
    const doc = parse(
      '![A](a.png)\n\n<caption>First</caption>\n\n<caption>Second</caption>',
    );
    expect(doc.children).toHaveLength(1);
    const figure = blockAt(doc, 0, 'figure');
    expect(figure.caption[0]).toMatchObject({
      children: [{ type: 'text', value: 'Second' }],
    });
  });

  it('centers a caption that trails a centered paragraph', () => {
    const doc = parse('<center>\ntext\n</center>\n\n<caption>Cap</caption>');
    expect(blockAt(doc, 1, 'paragraph')).toMatchObject({ centered: true });
  });

  it('keeps a caption inline when the previous block is unrelated', () => {
    const doc = parse('plain text\n\n<caption>Cap</caption>');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'paragraph',
    ]);
    expect(blockAt(doc, 1, 'paragraph').centered).toBeUndefined();
  });

  it('keeps a leading caption when no block precedes it', () => {
    const doc = parse('<caption>Cap</caption>');
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].type).toBe('paragraph');
  });

  it('does not pair a caption with a multi-node paragraph', () => {
    const doc = parse('text ![A](a.png)\n\n<caption>Cap</caption>');
    expect(doc.children.map((node) => node.type)).toEqual([
      'paragraph',
      'paragraph',
    ]);
  });

  it('collects a caption spread across several lines', () => {
    const doc = parse('![A](a.png)\n\n<caption>line one\nline two</caption>');
    expect(blockAt(doc, 0, 'figure').caption).toHaveLength(1);
  });

  it('leaves an unclosed caption as ordinary text', () => {
    expect(parse('<caption>never closed').children[0].type).toBe('paragraph');
  });

  it('breaks a paragraph when a caption follows', () => {
    const doc = parse('intro\n<caption>Cap</caption>');
    expect(doc.children).toHaveLength(2);
  });
});

describe('paragraph termination', () => {
  it('joins wrapped lines into a single paragraph', () => {
    expect(blockAt(parse('one\ntwo\nthree'), 0, 'paragraph').children).toEqual([
      { type: 'text', value: 'one two three' },
    ]);
  });

  it.each([
    ['a fenced block', '```\ncode\n```'],
    ['a heading', '# Title'],
    ['a blockquote', '> quote'],
    ['a thematic break', '---'],
    ['a math block', '$$x$$'],
    ['a table', '| a |\n| - |'],
    ['an HTML table', '<table><tr><td>x</td></tr></table>'],
  ])('ends a paragraph before %s', (_label, source) => {
    const doc = parse(`intro\n${source}`);
    expect(doc.children[0]).toMatchObject({ type: 'paragraph' });
    expect(doc.children.length).toBeGreaterThan(1);
  });
});

describe('indentation-sensitive block starts', () => {
  it('parses a blockquote indented up to three spaces', () => {
    const doc = parse('  > quoted');
    expect(doc.children[0]).toMatchObject({ type: 'blockquote' });
  });

  it('ends an indented blockquote when a line dedents past it', () => {
    const doc = parse('  > quoted\n> flush');
    expect(doc.children.map((node) => node.type)).toEqual([
      'blockquote',
      'blockquote',
    ]);
  });

  it('parses an HTML table indented up to three spaces', () => {
    expect(
      parse('  <table><tr><td>x</td></tr></table>').children[0],
    ).toMatchObject({ type: 'htmlTable' });
  });

  it('treats a fence indented four spaces as paragraph text', () => {
    expect(parse('    ```\ncode').children[0].type).toBe('paragraph');
  });

  it('treats a quote marker indented four spaces as paragraph text', () => {
    expect(parse('    > quoted').children[0].type).toBe('paragraph');
  });

  it('keeps a dedented line inside an indented article', () => {
    const list = blockAt(
      parse('- item\n  <article>\nx\n  </article>'),
      0,
      'list',
    );
    const article = list.items[0].children.find(
      (node) => node.type === 'asideArticle',
    );
    expect(article).toMatchObject({ type: 'asideArticle' });
  });

  it('does not split an indented callout from a dedented quote', () => {
    const doc = parse('  > [!NOTE]\n  > body\n\n> [!TIP]\n> other');
    expect(doc.children.map((node) => node.type)).toEqual([
      'callout',
      'callout',
    ]);
    expect(blockAt(doc, 0, 'callout').kind).toBe('note');
  });
});

describe('HTML attribute parsing in blocks', () => {
  it('reads single-quoted and unquoted image attributes', () => {
    expect(
      blockAt(
        parse("<center><img src='a.png' alt='A'></center>"),
        0,
        'paragraph',
      ).children,
    ).toEqual([{ type: 'image', alt: 'A', url: 'a.png' }]);
    expect(
      blockAt(parse('<center><img src=b.png></center>'), 0, 'paragraph')
        .children,
    ).toEqual([{ type: 'image', alt: '', url: 'b.png' }]);
  });

  it('rejects a zero pixel width', () => {
    expect(
      blockAt(
        parse('<center><img src="a.png" width="0px"></center>'),
        0,
        'paragraph',
      ).children,
    ).toEqual([{ type: 'image', alt: '', url: 'a.png' }]);
  });

  it('accepts a fractional pixel width', () => {
    expect(
      blockAt(
        parse('<center><img src="a.png" width="120.4px"></center>'),
        0,
        'paragraph',
      ).children,
    ).toEqual([{ type: 'image', alt: '', url: 'a.png', maxWidthPx: 120 }]);
  });
});

describe('center and caption edge cases', () => {
  it('centers non-paragraph content inside a center block', () => {
    const doc = parse('<center>\n# Heading\n</center>');
    expect(doc.children[0]).toMatchObject({ type: 'heading' });
  });

  it('abandons a center block that runs past its line budget', () => {
    const body = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
    expect(parse(`<center>\n${body}`).children[0].type).toBe('paragraph');
  });

  it('abandons a caption that runs past its line budget', () => {
    const body = Array.from({ length: 80 }, (_, i) => `line ${i}`).join('\n');
    expect(parse(`<caption>\n${body}`).children[0].type).toBe('paragraph');
  });

  it('does not pair a caption with a preceding heading', () => {
    const doc = parse('# Title\n\n<caption>Cap</caption>');
    expect(doc.children.map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
    ]);
  });

  it('leaves non-paragraph caption blocks uncentered after a centered block', () => {
    const doc = parse('<center>\ntext\n</center>\n\n<caption># H</caption>');
    expect(doc.children[1]).toMatchObject({ type: 'heading' });
  });
});

describe('tab indentation', () => {
  it('treats one tab as four columns of indentation', () => {
    const tabbed = blockAt(parse('- top\n\t- nested'), 0, 'list');
    const spaced = blockAt(parse('- top\n    - nested'), 0, 'list');
    expect(tabbed).toEqual(spaced);
  });

  it('nests a blockquote indented with a tab', () => {
    const list = blockAt(parse('- item\n\t> quoted'), 0, 'list');
    expect(list.items[0].children.map((node) => node.type)).toEqual([
      'paragraph',
      'blockquote',
    ]);
  });

  it('continues a list item paragraph across a tab-indented line', () => {
    const list = blockAt(parse('- first\n\n\tsecond'), 0, 'list');
    expect(list.items[0].children).toHaveLength(2);
  });

  it('preserves tabs inside fenced code content', () => {
    expect(blockAt(parse('```\n\tcode\n```'), 0, 'codeBlock').value).toBe(
      '\tcode',
    );
  });

  it('strips only the block indent from tab-indented code inside a list', () => {
    const list = blockAt(parse('- item\n\n\t```\n\tcode\n\t```'), 0, 'list');
    const block = list.items[0].children.find(
      (node) => node.type === 'codeBlock',
    );
    expect(block).toMatchObject({ type: 'codeBlock', value: 'code' });
  });

  it('parses a tab-indented table', () => {
    expect(parse('\t| A |\n\t| - |\n\t| 1 |').children[0]).toMatchObject({
      type: 'table',
    });
  });

  it('accepts mixed tab and space indentation', () => {
    const list = blockAt(parse('- top\n \t- nested'), 0, 'list');
    expect(list.items[0].children[1]).toMatchObject({ type: 'list' });
  });

  it('measures a tab between marker and text as four columns', () => {
    const list = blockAt(parse('-\titem'), 0, 'list');
    expect(list.items[0].children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'item' }] },
    ]);
  });

  it('continues a tab-separated list item at the marker width', () => {
    const list = blockAt(parse('-\tfirst\n\n     second'), 0, 'list');
    expect(list.items[0].children).toHaveLength(2);
  });

  it('indents a leading tab the same as four spaces', () => {
    expect(parse('\t# Title')).toEqual(parse('    # Title'));
    expect(parse('\t> quoted')).toEqual(parse('    > quoted'));
  });

  it('parses a nested document identically with tabs or four-space indents', () => {
    const withTabs = [
      '- top',
      '\t- nested',
      '\t\t- deeper',
      '- second',
      '\t> quoted',
      '',
      '\t| A |',
      '\t| - |',
      '\t| 1 |',
    ].join('\n');
    const withSpaces = withTabs.replace(/\t/g, '    ');
    expect(parse(withTabs)).toEqual(parse(withSpaces));
  });
});

describe('outbound anchors inside HTML tables', () => {
  /** Parse an HTML table and return its raw rendered HTML. */
  function tableHtml(inner: string): string {
    const node = parse(`<table><tr><td>${inner}</td></tr></table>`).children[0];
    if (node.type !== 'htmlTable') throw new Error('expected an htmlTable');
    return node.html;
  }

  it('opens an authored outbound anchor in a new tab', () => {
    expect(tableHtml('<a href="https://irs.gov">IRS</a>')).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://irs.gov">',
    );
  });

  it('leaves an in-app anchor in the current tab', () => {
    const html = tableHtml('<a href="../guides/intro">Intro</a>');
    expect(html).toContain('<a href="../guides/intro">');
    expect(html).not.toContain('_blank');
  });

  it('respects an authored target instead of overriding it', () => {
    expect(
      tableHtml('<a target="_self" href="https://irs.gov">IRS</a>'),
    ).toContain('<a target="_self" href="https://irs.gov">');
  });

  it('leaves an anchor with no href alone', () => {
    expect(tableHtml('<a>anchor</a>')).toContain('<a>anchor</a>');
  });
});
