import { describe, expect, it } from 'vitest';
import { parse } from '#lib/markdown/parser.js';
import type { BlockNode, TableNode } from '#lib/markdown/types.js';

/** Parse a source string that is expected to yield a single markdown table. */
function tableOf(source: string): TableNode {
  const node = parse(source).children[0];
  expect(node.type).toBe('table');
  return node as TableNode;
}

/** Parse a source string that is expected to yield a single HTML table. */
function htmlTableNode(
  source: string,
): Extract<BlockNode, { type: 'htmlTable' }> {
  const node = parse(source).children[0];
  expect(node.type).toBe('htmlTable');
  return node as Extract<BlockNode, { type: 'htmlTable' }>;
}

/** Return normalized HTML from a source table. */
function htmlTableOf(source: string): string {
  return htmlTableNode(source).html;
}

describe('markdown tables', () => {
  it('parses header, alignments, and body rows', () => {
    const table = tableOf('| A | B |\n| :- | -: |\n| 1 | 2 |\n| 3 | 4 |');
    expect(table.alignments).toEqual(['left', 'right']);
    expect(table.header.cells).toHaveLength(2);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells[1].children).toEqual([
      { type: 'text', value: '2' },
    ]);
  });

  it('maps every alignment marker', () => {
    expect(
      tableOf('| a | b | c | d |\n| :-: | -: | :- | --- |\n').alignments,
    ).toEqual(['center', 'right', 'left', null]);
  });

  it('accepts rows without leading or trailing pipes', () => {
    const table = tableOf('A | B\n- | -\n1 | 2');
    expect(table.header.cells).toHaveLength(2);
    expect(table.rows[0].cells[0].children).toEqual([
      { type: 'text', value: '1' },
    ]);
  });

  it('honors escaped pipes inside cells', () => {
    const table = tableOf('| A | B |\n| - | - |\n| x \\| y | z |');
    expect(table.rows[0].cells[0].children).toEqual([
      { type: 'text', value: 'x | y' },
    ]);
  });

  it('unescapes asterisks inside cells', () => {
    const table = tableOf('| Filing status |\n| - |\n| Surviving spouse\\* |');
    expect(table.rows[0].cells[0].children).toEqual([
      { type: 'text', value: 'Surviving spouse*' },
    ]);
  });

  it('parses inline markup inside cells', () => {
    const table = tableOf('| A |\n| - |\n| **b** |');
    expect(table.rows[0].cells[0].children).toMatchObject([{ type: 'bold' }]);
  });

  it('pads short rows and truncates long rows to the header width', () => {
    const table = tableOf('| A | B |\n| - | - |\n| 1 |\n| 1 | 2 | 3 |');
    expect(table.rows[0].cells).toHaveLength(2);
    expect(table.rows[1].cells).toHaveLength(2);
    expect(table.rows[1].cells[1].children).toEqual([
      { type: 'text', value: '2' },
    ]);
  });

  it('flags a single-cell row as a subheader', () => {
    const table = tableOf('| A | B |\n| - | - |\n| Section |\n| 1 | 2 |');
    expect(table.rows[0]).toMatchObject({
      isSubheader: true,
      subheaderCellIndex: 0,
    });
    expect(table.rows[1]).toMatchObject({
      isSubheader: false,
      subheaderCellIndex: null,
    });
  });

  it('never flags the header row as a subheader', () => {
    expect(tableOf('| A |\n| - |\n').header).toMatchObject({
      isSubheader: false,
      subheaderCellIndex: null,
    });
  });

  it('does not flag a subheader in a single-column table', () => {
    expect(tableOf('| A |\n| - |\n| x |').rows[0].isSubheader).toBe(false);
  });

  it('does not flag a padded multi-cell row as a subheader', () => {
    const table = tableOf('| A | B |\n| - | - |\n| x ||');
    expect(table.rows[0].isSubheader).toBe(false);
  });

  it('ends the table at a blank line', () => {
    const doc = parse('| A |\n| - |\n| 1 |\n\nafter');
    expect(doc.children.map((node) => node.type)).toEqual([
      'table',
      'paragraph',
    ]);
  });

  it('ends the table at a line that is not a row', () => {
    const doc = parse('| A |\n| - |\n| 1 |\nplain text');
    expect(doc.children.map((node) => node.type)).toEqual([
      'table',
      'paragraph',
    ]);
  });

  it('ends the table when indentation changes', () => {
    const doc = parse('| A |\n| - |\n| 1 |\n  | 2 |');
    expect((doc.children[0] as TableNode).rows).toHaveLength(1);
  });

  it('parses a table nested inside a list item', () => {
    const list = parse('- item\n\n  | A |\n  | - |\n  | 1 |')
      .children[0] as Extract<BlockNode, { type: 'list' }>;
    expect(list.items[0].children.some((node) => node.type === 'table')).toBe(
      true,
    );
  });

  it.each([
    ['no delimiter row', '| A | B |'],
    ['a mismatched column count', '| A | B |\n| - |\n'],
    ['an invalid delimiter cell', '| A | B |\n| - | x |\n'],
    ['no pipe characters', 'A B\n- -\n'],
    ['a blank delimiter line', '| A |\n\n'],
  ])('does not parse a table with %s', (_label, source) => {
    expect(parse(source).children[0].type).not.toBe('table');
  });
});

describe('HTML tables', () => {
  it('captures a single-line table', () => {
    expect(htmlTableOf('<table><tr><td>x</td></tr></table>')).toContain(
      '<td>x</td>',
    );
  });

  it('captures a multi-line table', () => {
    const html = htmlTableOf(
      '<table>\n  <tr>\n    <td>x</td>\n  </tr>\n</table>',
    );
    expect(html).toContain('<td>x</td>');
    expect(html.split('\n')).toHaveLength(5);
  });

  it('balances nested tables', () => {
    const html = htmlTableOf(
      '<table>\n<tr><td>\n<table><tr><td>inner</td></tr></table>\n</td></tr>\n</table>',
    );
    expect(html).toContain('inner');
    expect(html.trimEnd().endsWith('</table>')).toBe(true);
  });

  it('converts strong markdown inside cells', () => {
    expect(htmlTableOf('<table><tr><td>**bold**</td></tr></table>')).toContain(
      '<strong>bold</strong>',
    );
    expect(htmlTableOf('<table><tr><th>**h**</th></tr></table>')).toContain(
      '<strong>h</strong>',
    );
  });

  it('converts emphasis and strong emphasis markdown inside cells', () => {
    expect(
      htmlTableOf(
        '<table><tr><td class="align-center">The *later* of: (1) **three years** from filing</td></tr></table>',
      ),
    ).toContain(
      'The <em>later</em> of: (1) <strong>three years</strong> from filing',
    );
    expect(
      htmlTableOf('<table><tr><td>***both***</td></tr></table>'),
    ).toContain('<strong><em>both</em></strong>');
    expect(
      htmlTableOf('<table><tr><td>**bold with *inner* run**</td></tr></table>'),
    ).toContain('<strong>bold with <em>inner</em> run</strong>');
  });

  it('leaves non-emphasis asterisks inside cells alone', () => {
    expect(
      htmlTableOf('<table><tr><td>MFS (lived with spouse*)</td></tr></table>'),
    ).toContain('MFS (lived with spouse*)');
    expect(
      htmlTableOf('<table><tr><td>3 * 4 and 5 * 6</td></tr></table>'),
    ).toContain('3 * 4 and 5 * 6');
    expect(
      htmlTableOf('<table><tr><td>a \\*literal\\* b</td></tr></table>'),
    ).toContain('a *literal* b');
  });

  it('renders markdown images inside cells', () => {
    const html = htmlTableOf(
      '<table><tr><td>![Logo](../assets/logo.png)</td></tr></table>',
    );
    expect(html).toContain('src="../assets/logo.png"');
    expect(html).toContain('alt="Logo"');
    expect(html).toContain('data-html-table-image');
  });

  it('injects template definitions referenced from cells', () => {
    const html = htmlTableOf(
      '<table><tr><td>{{[T]}}</td></tr></table>\n\n{{[T]\n![Logo](../assets/logo.png)\n}}',
    );
    expect(html).toContain('src="../assets/logo.png"');
    expect(html).not.toContain('{{[T]}}');
  });

  it('normalizes markdown injected into cells by a template', () => {
    expect(
      htmlTableOf(
        '<table><tr><td>{{[T]}}</td></tr></table>\n\n{{[T]\n**bold**\n}}',
      ),
    ).toContain('<strong>bold</strong>');
  });

  it('collects footnote triggers injected into cells by a template', () => {
    const table = htmlTableNode(
      '<table><tr><td>{{[T]}}</td></tr></table>\n\n{{[T]\nvalue[^src]\n}}',
    );
    expect(table.footnotes).toEqual(['src']);
    expect(table.html).toContain('data-html-table-footnote="0"');
  });

  it('expands a template referenced from another template inside cells', () => {
    expect(
      htmlTableOf(
        '<table><tr><td>{{[A]}}</td></tr></table>\n\n{{[A]\nouter {{[B]}}\n}}\n\n{{[B]\ninner\n}}',
      ),
    ).toContain('outer inner');
  });

  it('keeps a self-referential template literal inside cells', () => {
    expect(
      htmlTableOf(
        '<table><tr><td>{{[T]}}</td></tr></table>\n\n{{[T]\nloop {{[T]}}\n}}',
      ),
    ).toContain('loop {{[T]}}');
  });

  it('keeps an unknown template reference literal inside cells', () => {
    expect(
      htmlTableOf('<table><tr><td>{{[NOPE]}}</td></tr></table>'),
    ).toContain('{{[NOPE]}}');
  });

  it('converts footnote references inside cells into popup triggers', () => {
    const table = htmlTableNode(
      '<table><tr><td>threshold[^17]</td><th>detail[^tax "note"]</th></tr></table>',
    );

    expect(table.footnotes).toEqual(['17', 'tax "note"']);
    expect(table.html).toContain(
      'data-html-table-footnote="0" aria-label="Open footnote 17">[17]</button>',
    );
    expect(table.html).toContain(
      'data-html-table-footnote="1" aria-label="Open footnote tax &quot;note&quot;">[tax "note"]</button>',
    );
    expect(table.html).not.toContain('[^17]');
  });

  it('leaves escaped, malformed, and non-cell footnote syntax literal', () => {
    const table = htmlTableNode(
      '<table><caption>source[^caption]</caption><tr><td>escaped\\[^1] empty[^] unclosed[^2</td></tr></table>',
    );

    expect(table.footnotes).toEqual([]);
    expect(table.html).toContain('source[^caption]');
    expect(table.html).toContain('escaped[^1] empty[^] unclosed[^2');
  });

  it('does not convert footnote-like syntax inside math runs', () => {
    const table = htmlTableNode(
      '<table><tr><td>\\([^17]\\) and $x[^18]$</td></tr></table>',
    );

    expect(table.footnotes).toEqual([]);
    expect(table.html).toContain('\\([^17]\\) and $x[^18]$');
  });

  it('converts balanced strong emphasis inside nested cell blocks', () => {
    expect(
      htmlTableOf(
        '<table><tr><td><p>***bold italic*** and **bold**</p></td></tr></table>',
      ),
    ).toContain(
      '<p><strong><em>bold italic</em></strong> and <strong>bold</strong></p>',
    );
  });

  it('converts balanced strong markdown across inline HTML elements', () => {
    const html = htmlTableOf(
      '<table><tr><th scope="colgroup" colspan="2" class="align-left">**Schedule C | <span style="color: #00b050;">Generally Taxable</span>**</th></tr></table>',
    );
    expect(html).toContain(
      '<th scope="colgroup" colspan="2" class="align-left"><strong>Schedule C | <span style="color:#00b050">Generally Taxable</span></strong></th>',
    );
    expect(html).not.toContain('**');
  });

  it('does not pair emphasis markers across block elements', () => {
    const html = htmlTableOf(
      '<table><tr><td><p>**open</p><p>closed**</p></td></tr></table>',
    );
    expect(html).toContain('<p>**open</p><p>closed**</p>');
  });

  it('keeps unmatched asterisks literal inside cell blocks', () => {
    const html = htmlTableOf(
      '<table><tr><td><p>**open</p><p>***also open</p><p>*single*</p><p>closed** and closed***</p></td></tr></table>',
    );
    expect(html).toContain('<p>**open</p>');
    expect(html).toContain('<p>***also open</p>');
    expect(html).toContain('<p><em>single</em></p>');
    expect(html).toContain('<p>closed** and closed***</p>');
  });

  it('leaves markdown outside table cells untouched', () => {
    expect(
      htmlTableOf(
        '<table><caption>**kept**</caption><tr><td>x</td></tr></table>',
      ),
    ).toContain('**kept**');
  });

  it('unescapes percent signs outside math runs', () => {
    expect(htmlTableOf('<table><tr><td>50\\%</td></tr></table>')).toContain(
      '50%',
    );
  });

  it('unescapes asterisks inside cells', () => {
    expect(
      htmlTableOf(
        '<table><tr><td>Qualifying surviving spouse\\*</td></tr></table>',
      ),
    ).toContain('<td>Qualifying surviving spouse*</td>');
  });

  it('preserves escaped percents inside math runs', () => {
    expect(
      htmlTableOf('<table><tr><td>\\(50\\%\\) and 10\\%</td></tr></table>'),
    ).toContain('\\(50\\%\\) and 10%');
    expect(
      htmlTableOf('<table><tr><td>$x\\%$ 10\\%</td></tr></table>'),
    ).toContain('$x\\%$ 10%');
    expect(
      htmlTableOf('<table><tr><td>$$x\\%$$ 10\\%</td></tr></table>'),
    ).toContain('$$x\\%$$ 10%');
  });

  it('unescapes dollar signs outside math runs', () => {
    expect(
      htmlTableOf('<table><tr><td>\\$5 and 10\\%</td></tr></table>'),
    ).toContain('$5 and 10%');
  });

  it('preserves escaped dollar signs inside math runs', () => {
    expect(
      htmlTableOf('<table><tr><td>\\(x = \\$5\\)</td></tr></table>'),
    ).toContain('\\(x = \\$5\\)');
    expect(
      htmlTableOf('<table><tr><td>$x \\$ y$ and \\$5</td></tr></table>'),
    ).toContain('$x \\$ y$ and $5');
  });

  it('handles an unclosed math delimiter in a cell', () => {
    expect(
      htmlTableOf('<table><tr><td>\\(open 10\\%</td></tr></table>'),
    ).toContain('10%');
  });

  it('parses an indented HTML table inside a list item', () => {
    const list = parse('- item\n\n  <table><tr><td>x</td></tr></table>')
      .children[0] as Extract<BlockNode, { type: 'list' }>;
    expect(
      list.items[0].children.some((node) => node.type === 'htmlTable'),
    ).toBe(true);
  });

  it('does not parse an unclosed HTML table', () => {
    expect(parse('<table>\n<tr><td>x</td></tr>').children[0].type).not.toBe(
      'htmlTable',
    );
  });

  it('abandons an HTML table that runs past its line budget', () => {
    const body = Array.from({ length: 1200 }, () => '<tr><td>x</td></tr>').join(
      '\n',
    );
    expect(parse(`<table>\n${body}`).children[0].type).not.toBe('htmlTable');
  });

  it('does not parse a table whose continuation dedents below the block', () => {
    const doc = parse('- item\n\n  <table>\n<tr><td>x</td></tr>\n  </table>');
    const list = doc.children[0] as Extract<BlockNode, { type: 'list' }>;
    expect(
      list.items[0].children.some((node) => node.type === 'htmlTable'),
    ).toBe(false);
  });
});

describe('dense-content table decorator', () => {
  it('marks the pipe table that immediately follows it', () => {
    const table = tableOf(
      '<!-- data-is-dense-content-table="true" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
    );
    expect(table.isDenseContent).toBe(true);
  });

  it('accepts whitespace and single quotes, and separates it from a paragraph', () => {
    const doc = parse(
      "Intro\n<!-- data-is-dense-content-table = 'true' -->\n| A | B |\n| - | - |\n| 1 | 2 |",
    );
    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].type).toBe('paragraph');
    expect(doc.children[1]).toMatchObject({
      type: 'table',
      isDenseContent: true,
    });
  });

  it('marks an HTML table on both the node and its opening tag', () => {
    const node = htmlTableNode(
      '<!-- data-is-dense-content-table="true" -->\n<table>\n<tr><td>A</td></tr>\n</table>',
    );
    expect(node.isDenseContent).toBe(true);
    expect(node.denseColumnCount).toBe(1);
    expect(node.html).toContain('<table data-is-dense-content-table="true">');
  });

  it('counts declared columns, summing colspan across the first row', () => {
    const node = htmlTableNode(
      '<!-- data-is-dense-content-table="true" -->\n<table>\n<tr><th colspan="3">A</th><th>B</th><th colspan="x">C</th></tr>\n<tr><td>1</td></tr>\n</table>',
    );
    expect(node.denseColumnCount).toBe(5);
  });

  it('counts no columns when the table declares no rows', () => {
    const node = htmlTableNode(
      '<!-- data-is-dense-content-table="true" -->\n<table>\n</table>',
    );
    expect(node.denseColumnCount).toBe(0);
  });

  it('marks an HTML table that follows a paragraph without a blank line', () => {
    const doc = parse(
      'Intro\n<!-- data-is-dense-content-table="true" -->\n<table>\n<tr><td>A</td></tr>\n</table>',
    );
    expect(doc.children).toHaveLength(2);
    expect(doc.children[1]).toMatchObject({
      type: 'htmlTable',
      isDenseContent: true,
    });
  });

  it('marks a table nested inside a list item', () => {
    const doc = parse(
      '- Item\n\n  <!-- data-is-dense-content-table="true" -->\n  | A | B |\n  | - | - |\n  | 1 | 2 |',
    );
    const list = doc.children[0];
    expect(list.type).toBe('list');
    if (list.type !== 'list') return;
    expect(
      list.items[0].children.find((node) => node.type === 'table'),
    ).toMatchObject({ isDenseContent: true });
  });

  it('keeps hyphenated terms on one line, nested formatting included', () => {
    const table = tableOf(
      '<!-- data-is-dense-content-table="true" -->\n| IRS-published | B |\n| - | - |\n| **Schedule 1-A** and `x-y` | em — dash |',
    );
    expect(table.header.cells[0].children).toEqual([
      { type: 'text', value: 'IRS\u2011published' },
    ]);
    const bold = table.rows[0].cells[0].children[0];
    expect(bold).toMatchObject({
      type: 'bold',
      children: [{ type: 'text', value: 'Schedule 1\u2011A' }],
    });
    expect(table.rows[0].cells[0].children[2]).toMatchObject({
      type: 'code',
      value: 'x-y',
    });
    expect(table.rows[0].cells[1].children).toEqual([
      { type: 'text', value: 'em — dash' },
    ]);
  });

  it('leaves hyphens alone in an undecorated table', () => {
    const table = tableOf('| IRS-published |\n| - |\n| a-b |');
    expect(table.header.cells[0].children).toEqual([
      { type: 'text', value: 'IRS-published' },
    ]);
  });

  it('keeps hyphenated terms unbroken in a dense HTML table without touching attributes', () => {
    const node = htmlTableNode(
      '<!-- data-is-dense-content-table="true" -->\n<table>\n<tr><td data-class="line-item">Schedule 1-A</td></tr>\n</table>',
    );
    expect(node.html).toContain('Schedule 1\u2011A');
    expect(node.html).toContain('data-class="line-item"');
  });

  it('leaves undecorated, falsely decorated, and unrelated blocks alone', () => {
    expect(tableOf('| A | B |\n| - | - |\n| 1 | 2 |').isDenseContent).toBe(
      undefined,
    );
    expect(
      tableOf(
        '<!-- data-is-dense-content-table="false" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
      ).isDenseContent,
    ).toBe(undefined);
    expect(htmlTableOf('<table>\n<tr><td>A</td></tr>\n</table>')).not.toContain(
      'data-is-dense-content-table',
    );
    const doc = parse(
      '<!-- data-is-dense-content-table="true" -->\n\nParagraph\n\n| A | B |\n| - | - |\n| 1 | 2 |',
    );
    expect(doc.children.at(-1)).not.toHaveProperty('isDenseContent');
  });
});

describe('freeze-columns decorator', () => {
  it('pins the requested number of leading columns', () => {
    const table = tableOf(
      '<!-- data-freeze-cols-left-offset="2" -->\n| A | B | C |\n| - | - | - |\n| 1 | 2 | 3 |',
    );
    expect(table.frozenLeftColumns).toBe(2);
  });

  it('stacks with the dense decorator in either order', () => {
    for (const source of [
      '<!-- data-is-dense-content-table="true" -->\n<!-- data-freeze-cols-left-offset="1" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
      '<!-- data-freeze-cols-left-offset = \'1\' -->\n<!-- data-is-dense-content-table="true" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
    ]) {
      expect(tableOf(source)).toMatchObject({
        isDenseContent: true,
        frozenLeftColumns: 1,
      });
    }
  });

  it('marks an HTML table on both the node and its opening tag', () => {
    const node = htmlTableNode(
      '<!-- data-freeze-cols-left-offset="3" -->\n<table>\n<tr><td>A</td></tr>\n</table>',
    );
    expect(node.frozenLeftColumns).toBe(3);
    expect(node.html).toContain('<table data-freeze-cols-left-offset="3">');
  });

  it('separates the decorator from a preceding paragraph', () => {
    const doc = parse(
      'Intro\n<!-- data-freeze-cols-left-offset="1" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
    );
    expect(doc.children).toHaveLength(2);
    expect(doc.children[1]).toMatchObject({ frozenLeftColumns: 1 });
  });

  it('ignores a zero offset, a non-numeric offset, and an orphan decorator', () => {
    expect(
      tableOf(
        '<!-- data-freeze-cols-left-offset="0" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
      ).frozenLeftColumns,
    ).toBe(undefined);
    expect(
      tableOf(
        '<!-- data-freeze-cols-left-offset="x" -->\n| A | B |\n| - | - |\n| 1 | 2 |',
      ).frozenLeftColumns,
    ).toBe(undefined);
    expect(htmlTableOf('<table>\n<tr><td>A</td></tr>\n</table>')).not.toContain(
      'data-freeze-cols-left-offset',
    );
    const doc = parse(
      '<!-- data-freeze-cols-left-offset="2" -->\n\nParagraph\n\n| A | B |\n| - | - |\n| 1 | 2 |',
    );
    expect(doc.children.at(-1)).not.toHaveProperty('frozenLeftColumns');
  });
});
