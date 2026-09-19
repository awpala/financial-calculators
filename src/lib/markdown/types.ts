/**
 * AST types for the markdown pipeline.
 *
 * The parser produces a {@link MarkdownDocument} of {@link BlockNode}s,
 * each of which may contain a tree of {@link InlineNode}s. Renderers and
 * transforms operate on these structures — never on raw markdown or
 * rendered HTML — so new block/inline kinds can be added without
 * touching the parser/renderer boundary.
 */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Literal text escaped by the renderer. */
export interface TextNode {
  /** Discriminant used to select the matching renderer. */
  type: 'text';
  /** Literal source content without its surrounding syntax. */
  value: string;
}

/** A hard break within an inline run. */
export interface LineBreakNode {
  /** Discriminant used to select the matching renderer. */
  type: 'lineBreak';
}

/** Strong emphasis around nested inline content. */
export interface BoldNode {
  /** Discriminant used to select the matching renderer. */
  type: 'bold';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Emphasis around nested inline content. */
export interface ItalicNode {
  /** Discriminant used to select the matching renderer. */
  type: 'italic';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Deleted or struck-through inline content. */
export interface StrikethroughNode {
  /** Discriminant used to select the matching renderer. */
  type: 'strikethrough';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Underlined inline content. */
export interface UnderlineNode {
  /** Discriminant used to select the matching renderer. */
  type: 'underline';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** An inline code span, optionally containing authored formatting. */
export interface CodeNode {
  /** Discriminant used to select the matching renderer. */
  type: 'code';
  /** Literal source content without its surrounding syntax. */
  value: string;
  /**
   * Rich inner content for the code span. Present only when the authored
   * `<code>` HTML tag wraps inline formatting such as `<u>…</u>`; when set,
   * renderers show these children instead of the literal {@link value}.
   */
  children?: InlineNode[];
}

/** An authored link whose URL is screened at rendering. */
export interface LinkNode {
  /** Discriminant used to select the matching renderer. */
  type: 'link';
  /** Authored destination; the renderer applies the appropriate URL policy. */
  url: string;
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** An inline image with alternative text and optional display width. */
export interface ImageNode {
  /** Discriminant used to select the matching renderer. */
  type: 'image';
  /** Alternative text describing the image. */
  alt: string;
  /** Authored destination; the renderer applies the appropriate URL policy. */
  url: string;
  /** Optional positive display-width cap in pixels; absent leaves natural sizing. */
  maxWidthPx?: number;
}

/** An inline reference resolved within the document scope. */
export interface FootnoteReferenceNode {
  /** Discriminant used to select the matching renderer. */
  type: 'footnoteReference';
  /** Identifier used to connect this node with its anchor or reference. */
  id: string;
}

/** An inline trigger and the content of its definition popup. */
export interface DefinitionReferenceNode {
  /** Discriminant used to select the matching renderer. */
  type: 'definitionReference';
  /** Heading text for the definition popup, from `data-term`. */
  term: string;
  /** Popup body content, parsed from `data-definition`. */
  definition: InlineNode[];
  /** Visible trigger text rendered inline. */
  children: InlineNode[];
}

/** LaTeX rendered within a prose line. */
export interface MathInlineNode {
  /** Discriminant used to select the matching renderer. */
  type: 'mathInline';
  /** Literal source content without its surrounding syntax. */
  value: string;
}

/** Display-style LaTeX carried within an inline sequence. */
export interface MathDisplayInlineNode {
  /** Discriminant used to select the matching renderer. */
  type: 'mathDisplayInline';
  /** Literal source content without its surrounding syntax. */
  value: string;
}

/** Inline content raised above the baseline. */
export interface SuperscriptNode {
  /** Discriminant used to select the matching renderer. */
  type: 'superscript';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Inline content lowered below the baseline. */
export interface SubscriptNode {
  /** Discriminant used to select the matching renderer. */
  type: 'subscript';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Inline content carrying a validated authored color. */
export interface ColoredTextNode {
  /** Discriminant used to select the matching renderer. */
  type: 'coloredText';
  /** Authored `#rrggbb` color, resolved to a legible theme pair at render time. */
  color: string;
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Block structure embedded in an inline position, such as a table cell. */
export interface EmbeddedBlocksInlineNode {
  /** Discriminant used to select the matching renderer. */
  type: 'embeddedBlocks';
  /** Nested blocks in document order. */
  blocks: BlockNode[];
}

/** Serializable alternatives the inline renderer accepts. */
export type InlineNode =
  | TextNode
  | LineBreakNode
  | BoldNode
  | ItalicNode
  | StrikethroughNode
  | UnderlineNode
  | CodeNode
  | LinkNode
  | ImageNode
  | FootnoteReferenceNode
  | DefinitionReferenceNode
  | MathInlineNode
  | MathDisplayInlineNode
  | SuperscriptNode
  | SubscriptNode
  | ColoredTextNode
  | EmbeddedBlocksInlineNode;

/** A document heading and its deterministic anchor. */
export interface HeadingNode {
  /** Discriminant used to select the matching renderer. */
  type: 'heading';
  /** HTML heading depth from one through six. */
  level: HeadingLevel;
  /** Identifier used to connect this node with its anchor or reference. */
  id: string;
  /** Marks this section and its subheadings as extra reading content. */
  isExtraContent?: boolean;
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** A paragraph of inline content with optional centering. */
export interface ParagraphNode {
  /** Discriminant used to select the matching renderer. */
  type: 'paragraph';
  /** Center the paragraph, e.g. content authored inside `<center>…</center>`. */
  centered?: boolean;
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** Fenced code with optional trusted server highlighting. */
export interface CodeBlockNode {
  /** Discriminant used to select the matching renderer. */
  type: 'codeBlock';
  /** Authored code language, or null when no language was supplied. */
  language: string | null;
  /** Literal source content without its surrounding syntax. */
  value: string;
  /** Server-generated Shiki HTML carrying both light and dark theme variables. */
  highlightedHtml?: string;
}

/** A diagram transformed on the server, or its source and rendering error. */
export interface MermaidDiagramNode {
  /** Discriminant used to select the matching renderer. */
  type: 'mermaidDiagram';
  /** Original definition retained for fallback display. */
  source: string;
  /** Trusted server-generated SVG, or null when rendering failed. */
  svg: string | null;
  /** Displayable rendering failure, or null on success. */
  error: string | null;
}

/** Block content resolved by a matching footnote reference. */
export interface FootnoteDefinitionNode {
  /** Discriminant used to select the matching renderer. */
  type: 'footnoteDefinition';
  /** Identifier used to connect this node with its anchor or reference. */
  id: string;
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}

/** Standalone LaTeX source for display typesetting. */
export interface MathBlockNode {
  /** Discriminant used to select the matching renderer. */
  type: 'mathBlock';
  /** Literal source content without its surrounding syntax. */
  value: string;
}

/** The block sequence belonging to one list entry. */
export interface ListItemNode {
  /** Discriminant used to select the matching renderer. */
  type: 'listItem';
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}

/** Supported numbering styles for ordered lists. */
export type OrderedListMarkerKind = 'decimal' | 'lower-alpha' | 'upper-alpha';

/** An ordered or unordered sequence of block-containing entries. */
export interface ListNode {
  /** Discriminant used to select the matching renderer. */
  type: 'list';
  /** Whether markers are numbered rather than bulleted. */
  ordered: boolean;
  /** Authored numbering style; absent uses decimal markers. */
  markerKind?: OrderedListMarkerKind;
  /** Initial ordinal for an ordered list; absent starts at one. */
  start?: number;
  /** List entries in source order. */
  items: ListItemNode[];
}

/** A quoted sequence of blocks. */
export interface BlockquoteNode {
  /** Discriminant used to select the matching renderer. */
  type: 'blockquote';
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}

/** Supported semantic roles for a callout. */
export type CalloutKind = 'note' | 'important' | 'warning' | 'caution' | 'tip';

/** An admonition with a semantic role and nested content. */
export interface CalloutNode {
  /** Discriminant used to select the matching renderer. */
  type: 'callout';
  /** Semantic role selecting the callout styling and icon. */
  kind: CalloutKind;
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}

/** An embedded article with validated presentation attributes. */
export interface AsideArticleNode {
  /** Discriminant used to select the matching renderer. */
  type: 'asideArticle';
  /** Authored data attributes interpreted by the renderer presentation policy. */
  dataAttributes: Record<string, string>;
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}

/** An image grouped with a parsed caption. */
export interface FigureNode {
  /** Discriminant used to select the matching renderer. */
  type: 'figure';
  /** The image displayed by this figure. */
  image: ImageNode;
  /** Parsed blocks displayed beneath the figure. */
  caption: BlockNode[];
}

/** A column alignment; null preserves the renderer default. */
export type TableAlignment = 'left' | 'center' | 'right' | null;

/** Inline content occupying one pipe-table cell. */
export interface TableCellNode {
  /** Discriminant used to select the matching renderer. */
  type: 'tableCell';
  /** Nested content in document order; owned by this AST. */
  children: InlineNode[];
}

/** An ordinary table row or a subheader spanning the table. */
export interface TableRowNode {
  /** Discriminant used to select the matching renderer. */
  type: 'tableRow';
  /** Cells in column order. */
  cells: TableCellNode[];
  /** Whether this row is a section band spanning the table. */
  isSubheader: boolean;
  /** Index of the subheader content cell, or null for an ordinary row. */
  subheaderCellIndex: number | null;
}

/** A pipe table with explicit alignments and layout hints. */
export interface TableNode {
  /** Discriminant used to select the matching renderer. */
  type: 'table';
  /** Alignment for each column, in header order. */
  alignments: TableAlignment[];
  /** Column-heading row. */
  header: TableRowNode;
  /** Body rows in source order. */
  rows: TableRowNode[];
  /** Widen columns in proportion to their content instead of letting auto layout squeeze prose-heavy ones. */
  isDenseContent?: boolean;
  /** Count of leftmost columns pinned in view during horizontal scroll. */
  frozenLeftColumns?: number;
}

/** An authored table sanitized by the parser before rendering; never construct from unchecked HTML. */
export interface HtmlTableNode {
  /** Discriminant used to select the matching renderer. */
  type: 'htmlTable';
  /** Normalized and sanitized HTML produced by the table parser. */
  html: string;
  /** Footnote identifiers indexed by generated table buttons. */
  footnotes: string[];
  /** Widen columns evenly instead of letting auto layout squeeze prose-heavy ones. */
  isDenseContent?: boolean;
  /** Columns declared by the first row, counting `colspan`, used to size a dense table. */
  denseColumnCount?: number;
  /** Count of leftmost columns pinned in view during horizontal scroll. */
  frozenLeftColumns?: number;
}

/** A visual separator between block sequences. */
export interface ThematicBreakNode {
  /** Discriminant used to select the matching renderer. */
  type: 'thematicBreak';
}

/** Serializable alternatives the block renderer accepts. */
export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | CodeBlockNode
  | MermaidDiagramNode
  | FootnoteDefinitionNode
  | MathBlockNode
  | ListNode
  | BlockquoteNode
  | CalloutNode
  | AsideArticleNode
  | FigureNode
  | TableNode
  | HtmlTableNode
  | ThematicBreakNode;

/** One parse result, owned by its caller and enriched in place by server transforms. */
export interface MarkdownDocument {
  /** Nested content in document order; owned by this AST. */
  children: BlockNode[];
}
