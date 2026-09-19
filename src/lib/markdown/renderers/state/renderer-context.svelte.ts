import { getContext, setContext } from 'svelte';

import type { ArticleThemeData, DenseTableLayout } from '../renderer-types.js';
import type { PopupSource } from './popups.svelte.js';
import type {
  BlockNode,
  HeadingLevel,
  InlineNode,
  OrderedListMarkerKind,
  TableAlignment,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '../../types.js';

const MARKDOWN_RENDERER_CONTEXT = Symbol('markdown-renderer');

/** Helpers and popup callbacks owned by one mounted renderer and shared with its descendants. */
export interface MarkdownRendererContextValue {
  /** Classes by heading level, shared with descendant renderers. */
  headingClass: Record<HeadingLevel, string>;
  /** Choose markers and spacing from list type and nesting depth. */
  listClass: (
    ordered: boolean,
    depth: number,
    markerKind?: OrderedListMarkerKind,
  ) => string;
  /** Map a column alignment to its presentation classes. */
  tableAlignClass: (align: TableAlignment | undefined) => string;
  /** Choose prose or centered-equation paragraph styling. */
  paragraphClass: (children: InlineNode[], centered?: boolean) => string;
  /** Recognize a title paragraph immediately preceding a table. */
  isTableTitleParagraph: (
    node: BlockNode,
    nextNode: BlockNode | undefined,
  ) => boolean;
  /** Classes preserving natural wrapping inside table cells. */
  tableCellFlowClass: () => string;
  /** Measure dense pipe-table columns; returns null for ordinary tables. */
  denseTableLayout: (node: TableNode) => DenseTableLayout | null;
  /** Compute the minimum character width for dense authored tables. */
  denseHtmlTableMinWidthCh: (columnCount: number) => number;
  /** Select the cell that supplies a table subheader band. */
  subheaderCellContent: (row: TableRowNode) => TableCellNode;
  /** Separate an article's optional heading from its body blocks. */
  articleHeadingAndBody: (children: BlockNode[]) => {
    /** Optional leading bold paragraph promoted to an article title. */
    title: InlineNode[] | null;
    /** Remaining article blocks in their original order. */
    body: BlockNode[];
  };
  /** Validate presentation attributes and derive theme styles. */
  articleThemeData: (
    dataAttributes: Record<string, string>,
  ) => ArticleThemeData;
  /** Normalize authored LaTeX spacing before typesetting. */
  normalizeLatexValue: (value: string) => string;
  /** Toggle a persistent popup at the supplied trigger; state belongs to this renderer. */
  togglePopup: (
    token: string,
    source: PopupSource,
    anchor: HTMLButtonElement,
  ) => void;
  /** Open a transient popup while its trigger is hovered. */
  showPopupOnHover: (
    token: string,
    source: PopupSource,
    anchor: HTMLButtonElement,
  ) => void;
  /** Close the matching hover popup without dismissing a persistent one. */
  hidePopupOnHover: (token: string) => void;
}

/** Register the ambient markdown renderer context for nested components. */
export function provideMarkdownRenderer(
  context: MarkdownRendererContextValue,
): MarkdownRendererContextValue {
  setContext(MARKDOWN_RENDERER_CONTEXT, context);
  return context;
}

/** Retrieve the ambient markdown renderer context. */
export function useMarkdownRenderer(): MarkdownRendererContextValue {
  const context = getContext<MarkdownRendererContextValue | undefined>(
    MARKDOWN_RENDERER_CONTEXT,
  );
  if (!context) {
    throw new Error(
      'useMarkdownRenderer() called outside of a MarkdownRenderer provider',
    );
  }
  return context;
}
