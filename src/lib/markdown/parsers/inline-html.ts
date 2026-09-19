import { normalizeCssColor } from '../colors.js';
import type { BlockNode, InlineNode, ListItemNode } from '../types.js';

/**
 * Authored HTML that carries *block* structure while sitting in an inline
 * position — most often inside a pipe-table cell, where markdown itself has no
 * way to express stacked paragraphs or a bulleted list.
 *
 * These productions turn that markup into real AST blocks, delivered back into
 * the inline stream as `embeddedBlocks`. Anything unrecognized or unbalanced is
 * left for the caller to emit literally, matching the parser's rule that
 * malformed input degrades to text.
 */

/** Find the closing `>` of a tag, skipping quoted attribute values. */
export function findTagEnd(text: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') return i;
  }
  return -1;
}

/** Span of an element's inner content plus the index just past its close tag. */
export interface TagSpan {
  /** Inclusive source offset immediately after the opening tag. */
  contentStart: number;
  /** Exclusive source offset immediately before the closing tag. */
  contentEnd: number;
  /** Source offset immediately after the complete element. */
  end: number;
}

/**
 * Locate the close tag matching the `<tag …>` that opens at `from`.
 *
 * Nested same-name elements are counted, so the outermost element is matched
 * rather than the first `</tag>` encountered.
 */
export function matchTag(
  text: string,
  tag: string,
  from: number,
): TagSpan | null {
  const openEnd = findTagEnd(text, from);
  if (openEnd === -1) return null;
  if (text[openEnd - 1] === '/') {
    return { contentStart: openEnd, contentEnd: openEnd, end: openEnd + 1 };
  }

  const open = new RegExp(`<${tag}(?=[\\s/>])|<${tag}$`, 'gi');
  const close = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1;
  let cursor = openEnd + 1;

  while (cursor < text.length) {
    close.lastIndex = cursor;
    const closeMatch = close.exec(text);
    if (!closeMatch) return null;

    open.lastIndex = cursor;
    let nested = open.exec(text);
    while (nested && nested.index < closeMatch.index) {
      depth++;
      open.lastIndex = nested.index + 1;
      nested = open.exec(text);
    }

    depth--;
    if (depth === 0) {
      return {
        contentStart: openEnd + 1,
        contentEnd: closeMatch.index,
        end: closeMatch.index + closeMatch[0].length,
      };
    }
    cursor = closeMatch.index + closeMatch[0].length;
  }
  return null;
}

/**
 * Read the `color` declaration out of an inline `style` attribute.
 *
 * The authored value is preserved exactly — these colors are a semantic cue in
 * the docs, not decoration — and is only screened for being a real CSS color.
 */
function styleColor(openTag: string): string | null {
  const style = openTag.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const declarations = style?.[1] ?? style?.[2];
  if (!declarations) return null;
  const color = declarations.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  return color ? normalizeCssColor(color[1]) : null;
}

/** A `<span>` resolved into the node it contributes and where it ends. */
export interface ParsedStyledSpan {
  /** Validated authored color, or null when absent or rejected. */
  color: string | null;
  /** Source inside the span for recursive inline parsing. */
  inner: string;
  /** Source offset immediately after the closing span. */
  end: number;
}

/**
 * Parse a presentational `<span>` beginning at `from`.
 *
 * A `color` style becomes a `coloredText` node; a span carrying no color is
 * reported with `color: null` so the caller can unwrap it to its contents
 * rather than leaking the tag into the rendered text.
 */
export function parseStyledSpan(
  text: string,
  from: number,
): ParsedStyledSpan | null {
  if (!/^<span(?=[\s/>])/i.test(text.slice(from, from + 6))) return null;
  const openEnd = findTagEnd(text, from);
  if (openEnd === -1) return null;
  const span = matchTag(text, 'span', from);
  if (!span) return null;
  return {
    color: styleColor(text.slice(from, openEnd + 1)),
    inner: text.slice(span.contentStart, span.contentEnd),
    end: span.end,
  };
}

/** Block-level HTML tags recognized while scanning an inline run. */
const INLINE_HTML_BLOCK_TAGS = ['p', 'ul', 'ol'] as const;

/** Parse block-level HTML beginning at `from` into AST blocks. */
export function parseInlineHtmlBlock(
  text: string,
  from: number,
  parseInline: (value: string) => InlineNode[],
): {
  /** Parsed paragraph/list content replacing the recognized HTML fragment. */
  blocks: BlockNode[];
  /** Exclusive source offset immediately after the matching closing tag. */
  end: number;
} | null {
  if (text[from] !== '<') return null;

  for (const tag of INLINE_HTML_BLOCK_TAGS) {
    if (
      !new RegExp(`^<${tag}(?=[\\s/>])`, 'i').test(text.slice(from, from + 5))
    )
      continue;
    const span = matchTag(text, tag, from);
    if (!span) continue;
    const inner = text.slice(span.contentStart, span.contentEnd);

    if (tag === 'p') {
      const blocks = inlineHtmlToBlocks(parseInline(inner));
      return blocks.length === 0 ? null : { blocks, end: span.end };
    }

    const items = parseListItems(inner, parseInline);
    if (items.length === 0) continue;
    return {
      blocks: [{ type: 'list', ordered: tag === 'ol', items }],
      end: span.end,
    };
  }
  return null;
}

/** Split an `<ul>`/`<ol>` body into its top-level `<li>` items. */
function parseListItems(
  html: string,
  parseInline: (value: string) => InlineNode[],
): ListItemNode[] {
  const items: ListItemNode[] = [];
  const openItem = /<li(?=[\s/>])/gi;
  let cursor = 0;

  while (cursor < html.length) {
    openItem.lastIndex = cursor;
    const open = openItem.exec(html);
    if (!open) break;
    const span = matchTag(html, 'li', open.index);
    if (!span) break;
    const children = inlineHtmlToBlocks(
      parseInline(html.slice(span.contentStart, span.contentEnd)),
    );
    if (children.length > 0) items.push({ type: 'listItem', children });
    cursor = span.end;
  }
  return items;
}

/**
 * Regroup a parsed inline run into blocks.
 *
 * Runs of ordinary inline content collapse into a paragraph, while nested
 * `embeddedBlocks` contribute their blocks directly — so a list authored inside
 * a `<p>` or `<li>` ends up a sibling of the surrounding text rather than
 * illegally nested inside a paragraph element.
 */
export function inlineHtmlToBlocks(nodes: InlineNode[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  let run: InlineNode[] = [];

  const flush = () => {
    if (run.some((node) => node.type !== 'lineBreak')) {
      blocks.push({ type: 'paragraph', children: run });
    }
    run = [];
  };

  for (const node of nodes) {
    if (node.type === 'embeddedBlocks') {
      flush();
      blocks.push(...node.blocks);
      continue;
    }
    run.push(node);
  }
  flush();
  return blocks;
}
