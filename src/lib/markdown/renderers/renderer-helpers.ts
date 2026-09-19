import { resolveArticleColorPair } from './article-colors.js';
import type { ArticleThemeData, DenseTableLayout } from './renderer-types.js';
import { inlinePlainText, inlineTextLength } from './text-utils.js';
import type {
  BlockNode,
  HeadingLevel,
  InlineNode,
  OrderedListMarkerKind,
  TableCellNode,
  TableAlignment,
  TableNode,
  TableRowNode,
} from '../types.js';

const DENSE_TABLE_MIN_COLUMN_CH = 24;
const DENSE_TABLE_MAX_COLUMN_CH = 72;

const unorderedListMarkers = [
  'list-disc',
  'list-[circle]',
  'list-[square]',
] as const;
const orderedMarkerClass: Record<OrderedListMarkerKind, string> = {
  decimal: 'list-decimal',
  'lower-alpha': 'list-[lower-alpha]',
  'upper-alpha': 'list-[upper-alpha]',
};

/** Shared heading typography indexed by semantic heading level. */
export const headingClass: Record<HeadingLevel, string> = {
  /** Typography for semantic heading level 1. */
  1: 'mt-8 mb-4 text-3xl font-bold tracking-tight text-indigo-900 first:mt-0 dark:text-indigo-200',
  /** Typography for semantic heading level 2. */
  2: 'mt-7 mb-3 text-2xl font-semibold text-indigo-900 dark:text-indigo-200',
  /** Typography for semantic heading level 3. */
  3: 'mt-6 mb-2 text-xl font-semibold text-indigo-800 dark:text-indigo-300',
  /** Typography for semantic heading level 4. */
  4: 'mt-5 mb-2 text-lg font-semibold text-indigo-800 dark:text-indigo-300',
  /** Typography for semantic heading level 5. */
  5: 'mt-4 mb-2 text-base font-semibold text-indigo-700 dark:text-indigo-300',
  /** Typography for semantic heading level 6. */
  6: 'mt-4 mb-2 text-sm font-semibold tracking-wide text-indigo-700 uppercase dark:text-indigo-300',
};

/** Choose list-marker style: source markers dictate ordered labels; unordered bullets cycle by depth. */
export function listClass(
  ordered: boolean,
  depth: number,
  markerKind?: OrderedListMarkerKind,
): string {
  const marker = ordered
    ? orderedMarkerClass[markerKind ?? 'decimal']
    : unorderedListMarkers[depth % unorderedListMarkers.length];
  return `${marker} my-3 space-y-1 pl-6 text-slate-700 dark:text-slate-300`;
}

/** Convert markdown table alignment metadata into cell text-alignment classes. */
export function tableAlignClass(align: TableAlignment | undefined): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

/**
 * Size a dense-content table's columns from the text each one carries.
 *
 * A column is measured by its longest single cell, which is what dictates how
 * tall that column makes its worst row. The longest cell in the table is given
 * a full prose measure and every other column scales against it, so columns
 * wrap to comparable line counts rather than one being shredded into a ribbon
 * while its neighbors sit half empty. Nothing falls below a floor wide enough
 * to hold an ordinary phrase on a line, so a column of short labels is never
 * squeezed down to one word per line.
 *
 * Widths are absolute, so their sum is also the width the table needs. That
 * total becomes a `min-width`: a table denser than its container scrolls
 * horizontally instead of compressing its prose.
 *
 * Returns `null` for tables that are not dense or carry no text.
 */
export function denseTableLayout(node: TableNode): DenseTableLayout | null {
  if (!node.isDenseContent) return null;

  const columnCount = node.header.cells.length;
  if (columnCount === 0) return null;

  const peaks = new Array<number>(columnCount).fill(0);
  for (const row of [node.header, ...node.rows]) {
    if (row.isSubheader) continue;
    for (let i = 0; i < columnCount; i++) {
      peaks[i] = Math.max(
        peaks[i],
        inlineTextLength(row.cells[i]?.children ?? []),
      );
    }
  }

  const longest = Math.max(...peaks);
  if (longest === 0) return null;

  const measure = Math.min(DENSE_TABLE_MAX_COLUMN_CH, longest);
  const widthsCh = peaks.map((peak) =>
    Math.max(DENSE_TABLE_MIN_COLUMN_CH, (peak / longest) * measure),
  );
  const totalCh = widthsCh.reduce((sum, width) => sum + width, 0);

  return {
    columnWidths: widthsCh.map(
      (width) => Math.round((width / totalCh) * 10000) / 100,
    ),
    minWidthCh: Math.round(totalCh),
  };
}

/**
 * Minimum width in ch for an authored dense table split into even columns.
 *
 * Authored tables can carry `colspan`/`rowspan`, which makes per-column text
 * measurement unreliable, so they get an even split midway between the
 * readability floor and the prose measure a measured table caps at.
 */
export function denseHtmlTableMinWidthCh(columnCount: number): number {
  return (
    (columnCount * (DENSE_TABLE_MIN_COLUMN_CH + DENSE_TABLE_MAX_COLUMN_CH)) / 2
  );
}

/** True when a paragraph is a standalone table title immediately before a table block. */
export function isTableTitleParagraph(
  node: BlockNode,
  nextNode: BlockNode | undefined,
): boolean {
  if (node.type !== 'paragraph') return false;
  if (!nextNode || (nextNode.type !== 'table' && nextNode.type !== 'htmlTable'))
    return false;
  const text = inlinePlainText(node.children).trim();
  if (!text) return false;
  return /^table\b/i.test(text);
}

/** Paragraph class helper. */
export { paragraphClass, tableCellFlowClass } from './text-utils.js';

/** Return the inline content used as the visible label for a subheader row. */
export function subheaderCellContent(row: TableRowNode): TableCellNode {
  const index = row.subheaderCellIndex ?? 0;
  return row.cells[index] ?? row.cells[0];
}

/** Convert a `#rrggbb` color to rgba for subtle background overlays. */
function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Blend two colors into an opaque `#rrggbb` value. */
function mixHex(top: string, bottom: string, topWeight: number): string {
  const weight = Math.max(0, Math.min(1, topWeight));
  const blend = (a: number, b: number) =>
    Math.round(a * weight + b * (1 - weight));
  const tr = Number.parseInt(top.slice(1, 3), 16);
  const tg = Number.parseInt(top.slice(3, 5), 16);
  const tb = Number.parseInt(top.slice(5, 7), 16);
  const br = Number.parseInt(bottom.slice(1, 3), 16);
  const bg = Number.parseInt(bottom.slice(3, 5), 16);
  const bb = Number.parseInt(bottom.slice(5, 7), 16);
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(blend(tr, br))}${toHex(blend(tg, bg))}${toHex(blend(tb, bb))}`;
}

/** Build article element attrs and styles from `data-*` metadata and theme mode. */
export function articleThemeData(
  dataAttributes: Record<string, string>,
  isDarkMode: boolean,
): ArticleThemeData {
  const attrs = { ...dataAttributes };
  const pair = resolveArticleColorPair(dataAttributes['data-color']);
  if (!pair) {
    return {
      attributes: attrs,
      containerStyle: undefined,
      titleStyle: undefined,
    };
  }

  attrs['data-dark-color'] = pair.dark;
  const activeAccent = isDarkMode ? pair.dark : pair.light;
  const containerAlpha = isDarkMode ? 0.12 : 0.08;
  const titleBackground = isDarkMode
    ? mixHex(activeAccent, '#0f172a', 0.32)
    : mixHex(activeAccent, '#ffffff', 0.2);

  return {
    attributes: attrs,
    containerStyle: `border-color:${activeAccent};background-color:${hexToRgba(activeAccent, containerAlpha)};`,
    titleStyle: `border-color:${activeAccent};background-color:${titleBackground};`,
  };
}

/** Extract a centered article pseudo-heading when the first block is `**bold**` only. */
export function articleHeadingAndBody(children: BlockNode[]): {
  /** Inline contents of an initial bold-only paragraph, or null when absent. */
  title: InlineNode[] | null;
  /** Remaining blocks; the original array is returned when no title is extracted. */
  body: BlockNode[];
} {
  const first = children[0];
  if (!first || first.type !== 'paragraph' || first.children.length !== 1) {
    return { title: null, body: children };
  }

  const only = first.children[0];
  if (only.type !== 'bold') {
    return { title: null, body: children };
  }

  return {
    title: only.children,
    body: children.slice(1),
  };
}
