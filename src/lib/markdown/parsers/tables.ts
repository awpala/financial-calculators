import type {
  InlineNode,
  TableAlignment,
  TableNode,
  TableRowNode,
} from '../types.js';
import type { ParserContext } from './context.js';
import { leadingIndent, sliceIndent } from './helpers.js';

const INTRA_WORD_HYPHEN_RE = /(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu;

/**
 * Mark a pipe table as dense content.
 *
 * Dense columns are sized to hold whole phrases, and no CSS property stops a
 * browser breaking a line at a hyphen, so intra-word hyphens become
 * non-breaking hyphens to keep terms like `Schedule 1-A` intact.
 */
export function markTableAsDenseContent(table: TableNode): TableNode {
  return {
    ...table,
    isDenseContent: true,
    header: keepTermsUnbroken(table.header),
    rows: table.rows.map(keepTermsUnbroken),
  };
}

/** Apply non-breaking hyphens across every cell of one row. */
function keepTermsUnbroken(row: TableRowNode): TableRowNode {
  return {
    ...row,
    cells: row.cells.map((cell) => ({
      ...cell,
      children: unbreakableHyphens(cell.children),
    })),
  };
}

/** Replace intra-word hyphens with non-breaking hyphens throughout an inline subtree. */
function unbreakableHyphens(nodes: InlineNode[]): InlineNode[] {
  return nodes.map((node) => {
    if (node.type === 'text') {
      return {
        ...node,
        value: node.value.replace(INTRA_WORD_HYPHEN_RE, '\u2011'),
      };
    }
    if (!('children' in node) || !node.children) return node;
    return { ...node, children: unbreakableHyphens(node.children) };
  });
}

/** Parse a pipe table with header, delimiter, and optional body rows. */
export function parseTable(ctx: ParserContext, baseIndent: number): TableNode {
  const headerCells = splitTableRow(
    sliceIndent(ctx.lines[ctx.index], baseIndent),
  );
  const delimiterCells = splitTableRow(
    sliceIndent(ctx.lines[ctx.index + 1], baseIndent),
  );
  if (!headerCells || !delimiterCells) {
    throw new Error('Invalid table parse state');
  }

  const alignments = parseAlignments(delimiterCells);
  if (!alignments) {
    throw new Error('Invalid table alignment row');
  }

  ctx.index += 2;
  const rows: TableRowNode[] = [];

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') break;
    if (leadingIndent(line) !== baseIndent) break;

    const rowCells = splitTableRow(sliceIndent(line, baseIndent));
    if (!rowCells) break;

    rows.push(makeTableRow(ctx, rowCells, headerCells.length, true));
    ctx.index++;
  }

  return {
    type: 'table',
    alignments,
    header: makeTableRow(ctx, headerCells, headerCells.length, false),
    rows,
  };
}

/** Return the table indent at the current line, or null if no table starts here. */
export function tableStartIndent(
  ctx: ParserContext,
  baseIndent: number,
): number | null {
  if (ctx.index >= ctx.lines.length) return null;
  const indent = leadingIndent(ctx.lines[ctx.index]);
  if (indent < baseIndent) return null;
  if (!isTableStart(ctx, indent)) return null;
  return indent;
}

/** True when the current line and next line form a markdown table start. */
function isTableStart(ctx: ParserContext, baseIndent: number): boolean {
  if (ctx.index + 1 >= ctx.lines.length) return false;
  const headerLine = ctx.lines[ctx.index];
  const delimiterLine = ctx.lines[ctx.index + 1];
  if (headerLine.trim() === '' || delimiterLine.trim() === '') return false;
  if (
    leadingIndent(headerLine) !== baseIndent ||
    leadingIndent(delimiterLine) !== baseIndent
  ) {
    return false;
  }

  const headerCells = splitTableRow(sliceIndent(headerLine, baseIndent));
  const delimiterCells = splitTableRow(sliceIndent(delimiterLine, baseIndent));
  if (!headerCells || !delimiterCells) return false;
  if (headerCells.length === 0 || headerCells.length !== delimiterCells.length)
    return false;
  return parseAlignments(delimiterCells) !== null;
}

/** Split one markdown table row into trimmed cells, honoring escaped pipes. */
function splitTableRow(line: string): string[] | null {
  if (!line.includes('|')) return null;

  let body = line.trim();
  if (body === '') return null;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);

  const cells: string[] = [];
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '|') {
      current += '|';
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

/** Parse markdown table delimiter cells into column alignments. */
function parseAlignments(cells: string[]): TableAlignment[] | null {
  const out: TableAlignment[] = [];

  for (const cell of cells) {
    if (!/^:?-+:?$/.test(cell)) return null;
    const starts = cell.startsWith(':');
    const ends = cell.endsWith(':');

    if (starts && ends) {
      out.push('center');
      continue;
    }
    if (ends) {
      out.push('right');
      continue;
    }
    if (starts) {
      out.push('left');
      continue;
    }
    out.push(null);
  }

  return out;
}

/** Build a normalized table row matching the header column count. */
function makeTableRow(
  ctx: ParserContext,
  cells: string[],
  width: number,
  allowSubheader: boolean,
): TableRowNode {
  const hasSingleCellRowShape = cells.length === 1;
  const normalized = cells.slice(0, width);
  while (normalized.length < width) {
    normalized.push('');
  }
  const nonEmptyIndices = normalized
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value.trim() !== '')
    .map((entry) => entry.index);
  const isSubheader =
    allowSubheader &&
    width > 1 &&
    hasSingleCellRowShape &&
    nonEmptyIndices.length === 1 &&
    nonEmptyIndices[0] === 0;

  return {
    type: 'tableRow',
    isSubheader,
    subheaderCellIndex: isSubheader ? nonEmptyIndices[0] : null,
    cells: normalized.map((value) => ({
      type: 'tableCell',
      children: ctx.parseInline(value, new Set<string>()),
    })),
  };
}
