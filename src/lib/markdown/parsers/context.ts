import type { BlockNode, InlineNode, OrderedListMarkerKind } from '../types.js';

/** Mutable state and shared parser services for one block-level parse. */
export interface ParserContext {
  /** Source lines for this parse invocation. */
  lines: string[];
  /** Next source line to consume; productions advance it on success. */
  index: number;
  /** Per-document heading counters shared by nested parses. */
  idCounts: Map<string, number>;
  /** Template definitions extracted from this document. */
  templates: Map<string, string>;
  /** Expansion ancestry used to stop recursive templates. */
  visitedTemplateTokens: Set<string>;
  /** Parse inline source using this document's shared context. */
  parseInline: (
    text: string,
    visitedTemplateTokens?: Set<string>,
  ) => InlineNode[];
  /** Parse nested lines with this document's identifiers and template scope. */
  parseNestedBlocks: (
    lines: string[],
    visitedTemplateTokens?: Set<string>,
  ) => BlockNode[];
}

/** Metadata extracted from one ordered or unordered list marker line. */
export interface ListLineMatch {
  /** Whether the matched marker denotes an ordered list. */
  ordered: boolean;
  /** Entry text after the list marker. */
  text: string;
  /** Indentation before the marker, measured in spaces. */
  leadingSpaces: number;
  /** Width of the marker and following spacing. */
  markerWidth: number;
  /** Numbering style when the marker is ordered. */
  markerKind?: OrderedListMarkerKind;
  /** Ordinal encoded by the marker, absent for unordered lists. */
  markerValue?: number;
}

/** Metadata describing the opening delimiter of a fenced code block. */
export interface CodeFenceStart {
  /** Delimiter character that must also close the fence. */
  fenceChar: '`' | '~';
  /** Minimum delimiter count required for the closing fence. */
  fenceLength: number;
  /** Language hint following the opening fence, or null. */
  language: string | null;
}
