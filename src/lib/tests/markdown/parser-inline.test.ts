import { describe, expect, it } from 'vitest';
import { parseInline } from '#lib/markdown/parser.js';
import type { InlineNode } from '#lib/markdown/types.js';

/** Collect the concatenated `value` of every text node in an inline tree. */
function textOf(nodes: InlineNode[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'code') out += node.value;
    else if (node.type === 'lineBreak') out += '\n';
    else if ('children' in node && Array.isArray(node.children)) {
      out += textOf(node.children);
    }
  }
  return out;
}

describe('inline escapes and entities', () => {
  it('unescapes ASCII punctuation and keeps other backslashes literal', () => {
    expect(parseInline('\\*not italic\\*')).toEqual([
      { type: 'text', value: '*not italic*' },
    ]);
    expect(parseInline('\\|\\<\\>\\{\\}')).toEqual([
      { type: 'text', value: '|<>{}' },
    ]);
  });

  it('keeps a backslash before a non-punctuation character', () => {
    expect(parseInline('\\a')).toEqual([{ type: 'text', value: '\\a' }]);
  });

  it('keeps a trailing backslash at end of input', () => {
    expect(parseInline('end\\')).toEqual([{ type: 'text', value: 'end\\' }]);
  });

  it('decodes named HTML entities', () => {
    expect(parseInline('a&nbsp;b')).toEqual([{ type: 'text', value: 'a b' }]);
    expect(parseInline('&amp;&lt;&gt;&quot;&apos;')).toEqual([
      { type: 'text', value: '&<>"\'' },
    ]);
  });

  it('decodes numeric and hexadecimal entities', () => {
    expect(parseInline('&#39;')).toEqual([{ type: 'text', value: "'" }]);
    expect(parseInline('&#65;&#x42;')).toEqual([{ type: 'text', value: 'AB' }]);
    expect(parseInline('&#X43;')).toEqual([{ type: 'text', value: 'C' }]);
  });

  it('leaves unknown and out-of-range entities untouched', () => {
    expect(parseInline('&copyright;')).toEqual([
      { type: 'text', value: '&copyright;' },
    ]);
    expect(parseInline('&#x110000;')).toEqual([
      { type: 'text', value: '&#x110000;' },
    ]);
    expect(parseInline('&#1114112;')).toEqual([
      { type: 'text', value: '&#1114112;' },
    ]);
  });

  it('splits hard line breaks into explicit nodes', () => {
    expect(parseInline('one\ntwo')).toEqual([
      { type: 'text', value: 'one' },
      { type: 'lineBreak' },
      { type: 'text', value: 'two' },
    ]);
  });
});

describe('inline emphasis', () => {
  it('parses bold, italic, strikethrough, and bold-italic', () => {
    expect(parseInline('**b**')).toMatchObject([
      { type: 'bold', children: [{ type: 'text', value: 'b' }] },
    ]);
    expect(parseInline('*i*')).toMatchObject([
      { type: 'italic', children: [{ type: 'text', value: 'i' }] },
    ]);
    expect(parseInline('~~s~~')).toMatchObject([
      { type: 'strikethrough', children: [{ type: 'text', value: 's' }] },
    ]);
    expect(parseInline('***both***')).toMatchObject([
      {
        type: 'italic',
        children: [
          { type: 'bold', children: [{ type: 'text', value: 'both' }] },
        ],
      },
    ]);
  });

  it('keeps unmatched emphasis markers literal', () => {
    expect(textOf(parseInline('**unclosed'))).toBe('**unclosed');
    expect(textOf(parseInline('***unclosed'))).toBe('***unclosed');
    expect(textOf(parseInline('~~unclosed'))).toBe('~~unclosed');
    expect(textOf(parseInline('*unclosed'))).toBe('*unclosed');
  });

  it('does not treat a marker adjacent to another asterisk as italic', () => {
    const nodes = parseInline('a ** b');
    expect(nodes.every((node) => node.type === 'text')).toBe(true);
  });

  it('skips escaped delimiters when searching for a closing marker', () => {
    expect(parseInline('**a\\**b**')).toMatchObject([
      { type: 'bold', children: [{ type: 'text', value: 'a**b' }] },
    ]);
  });

  it('skips math spans when searching for an italic close', () => {
    expect(parseInline('*a $x*y$ b*')).toMatchObject([
      {
        type: 'italic',
        children: [
          { type: 'text', value: 'a ' },
          { type: 'mathInline', value: 'x*y' },
          { type: 'text', value: ' b' },
        ],
      },
    ]);
  });

  it('skips escaped punctuation when searching for an italic close', () => {
    expect(parseInline('*a\\*b*')).toMatchObject([
      { type: 'italic', children: [{ type: 'text', value: 'a*b' }] },
    ]);
  });
});

describe('inline code spans', () => {
  it('parses single and multi-backtick code spans', () => {
    expect(parseInline('`x`')).toEqual([{ type: 'code', value: 'x' }]);
    expect(parseInline('``a ` b``')).toEqual([
      { type: 'code', value: 'a ` b' },
    ]);
  });

  it('keeps an unclosed backtick run literal', () => {
    expect(textOf(parseInline('`unclosed'))).toBe('`unclosed');
  });

  it('does not decode entities inside code spans', () => {
    expect(parseInline('`&amp;`')).toEqual([{ type: 'code', value: '&amp;' }]);
  });
});

describe('inline math', () => {
  it('parses inline and display math', () => {
    expect(parseInline('$x^2$')).toEqual([
      { type: 'mathInline', value: 'x^2' },
    ]);
    expect(parseInline('$$x^2$$')).toEqual([
      { type: 'mathDisplayInline', value: 'x^2' },
    ]);
  });

  it('treats escaped dollars as literal text', () => {
    expect(textOf(parseInline('\\$5 and \\$6'))).toBe('$5 and $6');
  });

  it('rejects empty and unclosed math runs', () => {
    expect(textOf(parseInline('$$$$'))).toBe('$$$$');
    expect(textOf(parseInline('$ $'))).toBe('$ $');
    expect(textOf(parseInline('$unclosed'))).toBe('$unclosed');
    expect(textOf(parseInline('$$unclosed'))).toBe('$$unclosed');
  });
});

describe('inline links and images', () => {
  it('parses links and parses their labels recursively', () => {
    expect(parseInline('[**bold**](https://example.com)')).toMatchObject([
      {
        type: 'link',
        url: 'https://example.com',
        children: [{ type: 'bold' }],
      },
    ]);
  });

  it('parses images and honors nested brackets in labels', () => {
    expect(parseInline('![alt](img.png)')).toEqual([
      { type: 'image', alt: 'alt', url: 'img.png' },
    ]);
    expect(parseInline('[a [b] c](u)')).toMatchObject([
      { type: 'link', url: 'u' },
    ]);
  });

  it('rejects malformed link syntax', () => {
    expect(textOf(parseInline('[label'))).toBe('[label');
    expect(textOf(parseInline('[label]not-paren'))).toBe('[label]not-paren');
    expect(textOf(parseInline('[label](unclosed'))).toBe('[label](unclosed');
    expect(textOf(parseInline('[label]()'))).toBe('[label]()');
  });

  it('parses a trailing width attribute block on images', () => {
    expect(parseInline('![a](i.png){width=320}')).toEqual([
      { type: 'image', alt: 'a', url: 'i.png', maxWidthPx: 320 },
    ]);
    expect(parseInline('![a](i.png) {width="240px"}')).toEqual([
      { type: 'image', alt: 'a', url: 'i.png', maxWidthPx: 240 },
    ]);
    expect(parseInline("![a](i.png){width='120.6'}")).toEqual([
      { type: 'image', alt: 'a', url: 'i.png', maxWidthPx: 121 },
    ]);
  });

  it('consumes attribute blocks that carry no usable width', () => {
    for (const source of [
      '![a](i.png){width=0}',
      '![a](i.png){width=auto}',
      '![a](i.png){width=}',
      '![a](i.png){height=40}',
    ]) {
      expect(parseInline(source)).toEqual([
        { type: 'image', alt: 'a', url: 'i.png' },
      ]);
    }
  });

  it('leaves unparsable attribute blocks as literal text', () => {
    for (const [source, literal] of [
      ['![a](i.png){}', '{}'],
      ['![a](i.png){novalue}', '{novalue}'],
      ['![a](i.png){=noKey}', '{=noKey}'],
      ['![a](i.png){unclosed=1', '{unclosed=1'],
    ] as const) {
      const nodes = parseInline(source);
      expect(nodes[0]).toEqual({ type: 'image', alt: 'a', url: 'i.png' });
      expect(textOf(nodes.slice(1))).toBe(literal);
    }
  });

  it('does not read attribute blocks after plain links', () => {
    const nodes = parseInline('[a](u){width=100}');
    expect(nodes[0]).toMatchObject({ type: 'link', url: 'u' });
    expect(textOf(nodes.slice(1))).toBe('{width=100}');
  });

  it('honors escapes while balancing link delimiters', () => {
    expect(parseInline('[a\\]b](u)')).toMatchObject([
      { type: 'link', url: 'u', children: [{ type: 'text', value: 'a]b' }] },
    ]);
  });
});

describe('inline footnote references', () => {
  it('parses footnote references', () => {
    expect(parseInline('text[^1]')).toEqual([
      { type: 'text', value: 'text' },
      { type: 'footnoteReference', id: '1' },
    ]);
  });

  it('keeps malformed footnote references literal', () => {
    expect(textOf(parseInline('[^unclosed'))).toBe('[^unclosed');
    expect(textOf(parseInline('[^]'))).toBe('[^]');
  });
});

describe('inline HTML tags', () => {
  it('maps literal formatting tags to semantic nodes', () => {
    expect(parseInline('<sup>a</sup>')).toMatchObject([
      { type: 'superscript' },
    ]);
    expect(parseInline('<sub>a</sub>')).toMatchObject([{ type: 'subscript' }]);
    expect(parseInline('<strong>a</strong>')).toMatchObject([{ type: 'bold' }]);
    expect(parseInline('<b>a</b>')).toMatchObject([{ type: 'bold' }]);
    expect(parseInline('<em>a</em>')).toMatchObject([{ type: 'italic' }]);
    expect(parseInline('<i>a</i>')).toMatchObject([{ type: 'italic' }]);
    expect(parseInline('<del>a</del>')).toMatchObject([
      { type: 'strikethrough' },
    ]);
    expect(parseInline('<s>a</s>')).toMatchObject([{ type: 'strikethrough' }]);
    expect(parseInline('<u>a</u>')).toMatchObject([{ type: 'underline' }]);
  });

  it('nests inline tags', () => {
    expect(parseInline('<sub><code>x</code></sub>')).toMatchObject([
      { type: 'subscript', children: [{ type: 'code', value: 'x' }] },
    ]);
  });

  it('keeps unclosed or unknown tags literal', () => {
    expect(textOf(parseInline('<sup>unclosed'))).toBe('<sup>unclosed');
    expect(textOf(parseInline('a < b'))).toBe('a < b');
  });

  it('unwraps a presentational span that carries no color', () => {
    expect(parseInline('<span>plain</span>')).toEqual([
      { type: 'text', value: 'plain' },
    ]);
  });

  it('keeps authored code tags literal unless they wrap underline runs', () => {
    expect(parseInline('<code>a**b**</code>')).toEqual([
      { type: 'code', value: 'a**b**' },
    ]);
    expect(parseInline('<code><u>11</u>00</code>')).toMatchObject([
      {
        type: 'code',
        value: '<u>11</u>00',
        children: [
          { type: 'underline', children: [{ type: 'text', value: '11' }] },
          { type: 'text', value: '00' },
        ],
      },
    ]);
  });

  it('keeps an unclosed underline run inside a code tag literal', () => {
    expect(parseInline('<code><u>oops</code>')).toMatchObject([
      {
        type: 'code',
        value: '<u>oops',
        children: [{ type: 'text', value: '<u>oops' }],
      },
    ]);
  });
});

describe('inline definition spans', () => {
  const span =
    '<span class="definition" data-term="Beta" data-definition="A **letter**">beta</span>';

  it('parses term, definition, and trigger content', () => {
    expect(parseInline(span)).toMatchObject([
      {
        type: 'definitionReference',
        term: 'Beta',
        definition: [{ type: 'text', value: 'A ' }, { type: 'bold' }],
        children: [{ type: 'text', value: 'beta' }],
      },
    ]);
  });

  it('decodes entities in the term', () => {
    const nodes = parseInline(
      '<span class="definition" data-term="A&amp;B" data-definition="d">x</span>',
    );
    expect(nodes[0]).toMatchObject({ term: 'A&B' });
  });

  it('unwraps to the span content when the span is not a definition', () => {
    expect(
      textOf(parseInline('<span class="other" data-term="a">x</span>')),
    ).toBe('x');
    expect(
      textOf(parseInline('<span class="definition" data-term="a">x</span>')),
    ).toBe('x');
    expect(
      textOf(
        parseInline('<span class="definition" data-definition="d">x</span>'),
      ),
    ).toBe('x');
    expect(textOf(parseInline("<span data-term='a'>x</span>"))).toBe('x');
  });

  it('returns literal text when the span never closes', () => {
    const open =
      '<span class="definition" data-term="A" data-definition="B">no close';
    expect(textOf(parseInline(open))).toBe(open);
  });

  it('returns literal text when the opening tag never ends', () => {
    expect(textOf(parseInline('<span class="definition'))).toBe(
      '<span class="definition',
    );
  });

  it('skips quoted angle brackets while finding the tag end', () => {
    const nodes = parseInline(
      '<span class="definition" data-term="a>b" data-definition="d">x</span>',
    );
    expect(nodes[0]).toMatchObject({
      type: 'definitionReference',
      term: 'a>b',
    });
  });
});

describe('inline template references', () => {
  const templates = new Map([
    ['ONE', '**injected**'],
    ['MULTI', 'first\n\nsecond'],
    ['SELF', 'loop {{[SELF]}}'],
  ]);

  it('expands a single-paragraph template inline when id counts are shared', () => {
    const nodes = parseInline(
      'a {{[ONE]}} b',
      templates,
      new Set(),
      new Map<string, number>(),
    );
    expect(nodes).toMatchObject([
      { type: 'text', value: 'a ' },
      { type: 'bold' },
      { type: 'text', value: ' b' },
    ]);
  });

  it('embeds multi-block templates as embedded blocks', () => {
    const nodes = parseInline(
      '{{[MULTI]}}',
      templates,
      new Set(),
      new Map<string, number>(),
    );
    expect(nodes[0]).toMatchObject({ type: 'embeddedBlocks' });
    expect((nodes[0] as { blocks: unknown[] }).blocks).toHaveLength(2);
  });

  it('falls back to inline-only expansion without id counts', () => {
    expect(parseInline('{{[ONE]}}', templates)).toMatchObject([
      { type: 'bold' },
    ]);
  });

  it('stops self-recursive templates after one expansion', () => {
    const nodes = parseInline('{{[SELF]}}', templates);
    expect(textOf(nodes)).toBe('loop {{[SELF]}}');
  });

  it('keeps unknown and malformed template tokens literal', () => {
    expect(textOf(parseInline('{{[MISSING]}}', templates))).toBe(
      '{{[MISSING]}}',
    );
    expect(textOf(parseInline('{{[UNCLOSED', templates))).toBe('{{[UNCLOSED');
    expect(textOf(parseInline('{{[ ]}}', templates))).toBe('{{[ ]}}');
  });
});

describe('inline emphasis interactions', () => {
  it('skips bold runs when closing an italic span', () => {
    expect(parseInline('*a **b** c*')).toMatchObject([
      {
        type: 'italic',
        children: [
          { type: 'text', value: 'a ' },
          { type: 'bold', children: [{ type: 'text', value: 'b' }] },
          { type: 'text', value: ' c' },
        ],
      },
    ]);
  });
});

describe('inline colored spans', () => {
  it('keeps the authored color verbatim', () => {
    expect(parseInline('<span style="color: #00b050;">Taxable</span>')).toEqual(
      [
        {
          type: 'coloredText',
          color: '#00b050',
          children: [{ type: 'text', value: 'Taxable' }],
        },
      ],
    );
  });

  it('parses markdown inside the span', () => {
    expect(
      parseInline('<span style="color: #ee0000">**No**</span>'),
    ).toMatchObject([
      {
        type: 'coloredText',
        color: '#ee0000',
        children: [{ type: 'bold' }],
      },
    ]);
  });

  it('accepts named and functional color notations', () => {
    expect(parseInline('<span style="color: red">x</span>')).toMatchObject([
      { type: 'coloredText', color: 'red' },
    ]);
    expect(
      parseInline('<span style="color: rgb(0, 176, 80)">x</span>'),
    ).toMatchObject([{ type: 'coloredText', color: 'rgb(0, 176, 80)' }]);
  });

  it('drops a color that is not a plain CSS color', () => {
    expect(
      parseInline('<span style="color: url(javascript:alert(1))">x</span>'),
    ).toEqual([{ type: 'text', value: 'x' }]);
  });

  it('ignores style declarations other than color', () => {
    expect(parseInline('<span style="font-weight: bold">x</span>')).toEqual([
      { type: 'text', value: 'x' },
    ]);
  });

  it('matches the outer span when spans nest', () => {
    expect(
      parseInline(
        '<span style="color: #00b050;">a<span style="color: #ee0000;">b</span></span>',
      ),
    ).toMatchObject([
      {
        type: 'coloredText',
        color: '#00b050',
        children: [
          { type: 'text', value: 'a' },
          { type: 'coloredText', color: '#ee0000' },
        ],
      },
    ]);
  });

  it('stays literal when the span never closes', () => {
    const open = '<span style="color: #00b050;">no close';
    expect(textOf(parseInline(open))).toBe(open);
  });
});

describe('block-level HTML in inline position', () => {
  it('renders stacked paragraphs authored in a table cell', () => {
    expect(parseInline('<p>One</p><p>Two</p>')).toMatchObject([
      { type: 'embeddedBlocks', blocks: [{ type: 'paragraph' }] },
      { type: 'embeddedBlocks', blocks: [{ type: 'paragraph' }] },
    ]);
  });

  it('parses markdown inside an authored paragraph', () => {
    expect(parseInline('<p>**bold**</p>')).toMatchObject([
      {
        type: 'embeddedBlocks',
        blocks: [{ type: 'paragraph', children: [{ type: 'bold' }] }],
      },
    ]);
  });

  it('builds a real list from authored list markup', () => {
    expect(parseInline('<ul><li>x</li><li>y</li></ul>')).toMatchObject([
      {
        type: 'embeddedBlocks',
        blocks: [
          {
            type: 'list',
            ordered: false,
            items: [
              { type: 'listItem', children: [{ type: 'paragraph' }] },
              { type: 'listItem', children: [{ type: 'paragraph' }] },
            ],
          },
        ],
      },
    ]);
  });

  it('marks an authored ordered list as ordered', () => {
    expect(parseInline('<ol><li>x</li></ol>')).toMatchObject([
      { type: 'embeddedBlocks', blocks: [{ type: 'list', ordered: true }] },
    ]);
  });

  it('keeps a nested list a sibling of the item text, not inside its paragraph', () => {
    expect(parseInline('<ul><li>x<ul><li>y</li></ul></li></ul>')).toMatchObject(
      [
        {
          type: 'embeddedBlocks',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  type: 'listItem',
                  children: [{ type: 'paragraph' }, { type: 'list' }],
                },
              ],
            },
          ],
        },
      ],
    );
  });

  it('stays literal when the block tag never closes', () => {
    expect(textOf(parseInline('<p>no close'))).toBe('<p>no close');
    expect(textOf(parseInline('<ul><li>x'))).toBe('<ul><li>x');
  });

  it('treats a line break tag as a hard break', () => {
    expect(parseInline('a<br/>b')).toEqual([
      { type: 'text', value: 'a' },
      { type: 'lineBreak' },
      { type: 'text', value: 'b' },
    ]);
    expect(parseInline('a<br>b')).toMatchObject([
      { type: 'text' },
      { type: 'lineBreak' },
      { type: 'text' },
    ]);
  });

  it('leaves a stray less-than sign alone', () => {
    expect(textOf(parseInline('tips <\\$20/month'))).toBe('tips <$20/month');
  });
});

describe('malformed authored HTML in inline position', () => {
  it('handles a self-closing colored span', () => {
    expect(parseInline('<span style="color: #ee0000;"/>')).toEqual([
      { type: 'coloredText', color: '#ee0000', children: [] },
    ]);
  });

  it('keeps an unmatched outer span literal while the inner one still resolves', () => {
    expect(textOf(parseInline('<span><span></span>'))).toBe('<span>');
  });

  it('stays literal when an empty authored paragraph has nothing to render', () => {
    expect(textOf(parseInline('<p></p>'))).toBe('<p></p>');
  });

  it('stays literal when a list has no items', () => {
    expect(textOf(parseInline('<ul></ul>'))).toBe('<ul></ul>');
  });
});
