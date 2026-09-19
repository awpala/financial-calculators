import type {
  BlockNode,
  HtmlTableNode,
  ImageNode,
  InlineNode,
} from '../types.js';
import type { ParserContext } from './context.js';
import {
  leadingIndent,
  parseHtmlAttr,
  parseHtmlWidthPx,
  sliceIndent,
} from './helpers.js';
import { parseMathExpression } from './inline.js';
import { expandTemplateReferences } from './templates.js';
import { sanitizeTableHtml } from './html-safety.js';

const FOOTNOTE_DEF_RE = /^\s*\[\^([^\]]+)\]:\s*(.*)$/;
const CAPTION_OPEN_RE = /^<caption>/i;
const CAPTION_CLOSE_RE = /<\/caption>/i;
const STANDALONE_HTML_COMMENT_RE = /^<!--[\s\S]*-->$/;
const HTML_TABLE_OPEN_RE = /^<table\b/i;
const HTML_TABLE_OPEN_TAG_RE = /<table\b[^>]*>/gi;
const HTML_TABLE_CLOSE_TAG_RE = /<\/table\s*>/gi;
const CENTER_OPEN_TAG_RE = /^<center\b[^>]*>/i;
const CENTER_CLOSE_TAG_RE = /<\/center>/i;
const IMG_TAG_RE = /<img\b[^>]*>/i;
const STRONG_EMPHASIS_MARKDOWN_RE =
  /(?<![\\*])\*\*\*(?!\*)([^*\s](?:[\s\S]*?[^*\s\\])?)\*\*\*(?!\*)/g;
const STRONG_MARKDOWN_RE =
  /(?<![\\*])\*\*(?!\*)([^*\s](?:[\s\S]*?[^*\s\\])?)\*\*(?!\*)/g;
const EMPHASIS_MARKDOWN_RE =
  /(?<![\\*])\*(?!\*)([^*\s](?:[\s\S]*?[^*\s\\])?)\*(?!\*)/g;
const HTML_TABLE_BLOCK_BOUNDARY_RE =
  /(<\/?(?:address|article|aside|blockquote|caption|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>)/gi;
const INLINE_HTML_TAG_RE = /<!--[\s\S]*?-->|<[^>]*>/g;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const INLINE_HTML_TAG_TOKEN_RE = /\0(\d+)\0/g;

/** Parse a footnote definition and its quote-delimited continuation lines. */
export function parseFootnoteDefinitionBlock(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode | null {
  if (ctx.index >= ctx.lines.length) return null;
  const line = ctx.lines[ctx.index];
  if (leadingIndent(line) < baseIndent) return null;

  const content = sliceIndent(line, baseIndent);
  const match = content.match(FOOTNOTE_DEF_RE);
  if (!match) return null;

  const id = match[1].trim();
  const bodyLines: string[] = [];
  if (match[2].trim() !== '') {
    bodyLines.push(match[2]);
  }
  ctx.index++;

  while (ctx.index < ctx.lines.length) {
    const next = ctx.lines[ctx.index];
    if (next.trim() === '') break;
    if (!isFootnoteQuoteContinuationLine(next, baseIndent)) break;
    bodyLines.push(stripFootnoteQuotePrefix(next, baseIndent));
    ctx.index++;
  }

  return {
    type: 'footnoteDefinition',
    id,
    children: ctx.parseNestedBlocks(bodyLines),
  };
}

/** True when a line begins a footnote definition at or after `baseIndent`. */
export function isFootnoteDefinitionStartLine(
  line: string,
  baseIndent: number,
): boolean {
  if (leadingIndent(line) < baseIndent) return false;
  return FOOTNOTE_DEF_RE.test(sliceIndent(line, baseIndent));
}

/** True when a line belongs to a quote-delimited footnote continuation block. */
function isFootnoteQuoteContinuationLine(
  line: string,
  baseIndent: number,
): boolean {
  if (leadingIndent(line) < baseIndent) return false;
  const content = sliceIndent(line, baseIndent);
  return /^\s*>/.test(content);
}

/** Strip one leading quote marker from a footnote continuation line. */
function stripFootnoteQuotePrefix(line: string, baseIndent: number): string {
  const content = sliceIndent(line, baseIndent);
  const match = content.match(/^\s*>\s?(.*)$/);
  return match ? match[1] : content;
}

/** True when paragraph text is exactly one HTML comment token. */
export function isStandaloneHtmlComment(text: string): boolean {
  return STANDALONE_HTML_COMMENT_RE.test(text.trim());
}

/**
 * Mark an authored HTML table as dense content.
 *
 * The flag lands both on the node, which drives the surrounding frame, and on
 * the opening `<table>` tag, which is the only part of the markup the renderer
 * passes through `{@html}` untouched.
 */
export function markHtmlTableAsDenseContent(
  node: HtmlTableNode,
): HtmlTableNode {
  return {
    ...node,
    isDenseContent: true,
    denseColumnCount: countHtmlTableColumns(node.html),
    html: keepHtmlTableTermsUnbroken(node.html).replace(
      /<table\b/i,
      '<table data-is-dense-content-table="true"',
    ),
  };
}

/**
 * Pin the leftmost columns of an authored HTML table.
 *
 * Like the dense marker, the count lands on the node and on the opening
 * `<table>` tag, which is the part of the markup the renderer passes through
 * `{@html}` untouched.
 */
export function markHtmlTableFrozenColumns(
  node: HtmlTableNode,
  frozenLeftColumns: number,
): HtmlTableNode {
  return {
    ...node,
    frozenLeftColumns,
    html: node.html.replace(
      /<table\b/i,
      `<table data-freeze-cols-left-offset="${frozenLeftColumns}"`,
    ),
  };
}

/**
 * Replace intra-word hyphens with non-breaking hyphens in an authored table's
 * text, leaving tag names and attributes untouched.
 */
function keepHtmlTableTermsUnbroken(html: string): string {
  return html.replace(
    />([^<]+)</g,
    (_full, text: string) =>
      `>${text.replace(/(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, '\u2011')}<`,
  );
}

/** Count the columns an authored table declares, summing `colspan` across its first row. */
function countHtmlTableColumns(html: string): number {
  const firstRow = html.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
  if (!firstRow) return 0;

  let count = 0;
  for (const cell of firstRow[1].matchAll(/<(?:td|th)\b([^>]*)>/gi)) {
    const span = cell[1].match(/\bcolspan\s*=\s*["']?(\d+)/i);
    count += span ? Math.max(1, Number(span[1])) : 1;
  }
  return count;
}

/** Parse a `<table>...</table>` HTML fragment as a table block node. */
export function parseHtmlTableBlock(
  ctx: ParserContext,
  baseIndent: number,
): HtmlTableNode | null {
  if (ctx.index >= ctx.lines.length) return null;
  if (leadingIndent(ctx.lines[ctx.index]) < baseIndent) return null;

  const firstLine = sliceIndent(ctx.lines[ctx.index], baseIndent).trimStart();
  if (!HTML_TABLE_OPEN_RE.test(firstLine)) return null;

  const tableLines: string[] = [];
  let depth = 0;
  let consumed = 0;

  while (ctx.index + consumed < ctx.lines.length) {
    const rawLine = ctx.lines[ctx.index + consumed];
    if (leadingIndent(rawLine) < baseIndent) return null;

    const content = sliceIndent(rawLine, baseIndent);
    tableLines.push(content);
    depth += countHtmlTableTagMatches(content, HTML_TABLE_OPEN_TAG_RE);
    depth -= countHtmlTableTagMatches(content, HTML_TABLE_CLOSE_TAG_RE);
    consumed++;

    if (depth <= 0) {
      ctx.index += consumed;
      const table = normalizeInlineMarkdownInHtmlTable(
        tableLines.join('\n'),
        ctx,
      );
      return {
        type: 'htmlTable',
        ...table,
      };
    }

    if (consumed > 1024) return null;
  }

  return null;
}

/** Apply tolerant inline markdown normalization inside explicit HTML table cells. */
function normalizeInlineMarkdownInHtmlTable(
  html: string,
  ctx: ParserContext,
): Omit<HtmlTableNode, 'type'> {
  const footnotes: string[] = [];
  const normalizedHtml = html.replace(
    /<(td|th)(\b[^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag, attrs, body) => {
      const injected = expandTemplateReferences(
        body,
        ctx.templates,
        ctx.visitedTemplateTokens,
      );
      const normalizedBody = normalizeMarkdownInHtmlTableText(
        injected,
        footnotes,
      );
      return `<${tag}${attrs}>${normalizedBody}</${tag}>`;
    },
  );
  return {
    html: sanitizeTableHtml(normalizedHtml),
    footnotes,
  };
}

/** Convert supported markdown and unescape table literals in plain HTML text. */
function normalizeMarkdownInHtmlTableText(
  value: string,
  footnotes: string[],
): string {
  return value
    .split(HTML_TABLE_BLOCK_BOUNDARY_RE)
    .map((part, index) =>
      index % 2 === 0 ? normalizeInlineHtmlTextRun(part, footnotes) : part,
    )
    .join('');
}

/** Normalize one inline HTML run while preserving its tags and attributes. */
function normalizeInlineHtmlTextRun(
  value: string,
  footnotes: string[],
): string {
  const tags: string[] = [];
  const protect = (html: string): string => {
    const token = `\0${tags.length}\0`;
    tags.push(html);
    return token;
  };
  const protectedValue = value
    .replace(INLINE_HTML_TAG_RE, protect)
    .replace(MARKDOWN_IMAGE_RE, (_full, alt: string, url: string) =>
      protect(renderHtmlTableImage(alt, url)),
    );
  const normalized = protectedValue
    .replace(STRONG_EMPHASIS_MARKDOWN_RE, '<strong><em>$1</em></strong>')
    .replace(STRONG_MARKDOWN_RE, '<strong>$1</strong>')
    .replace(EMPHASIS_MARKDOWN_RE, '<em>$1</em>');
  const unescaped = normalizeTableLiteralsAndFootnotes(normalized, footnotes);
  return unescaped.replace(
    INLINE_HTML_TAG_TOKEN_RE,
    (_token, index: string) => tags[Number(index)] ?? _token,
  );
}

/** Render a markdown image reference as an HTML-table image element. */
function renderHtmlTableImage(alt: string, url: string): string {
  return `<img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" data-html-table-image />`;
}

/** Unescape table literals and render footnote triggers outside math runs. */
function normalizeTableLiteralsAndFootnotes(
  text: string,
  footnotes: string[],
): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('\\[', i)) {
      out += '[';
      i += 2;
      continue;
    }
    if (text.startsWith('\\*', i)) {
      out += '*';
      i += 2;
      continue;
    }
    if (text.startsWith('\\%', i)) {
      out += '%';
      i += 2;
      continue;
    }
    if (text.startsWith('\\$', i)) {
      out += '$';
      i += 2;
      continue;
    }
    if (text.startsWith('\\(', i)) {
      const close = text.indexOf('\\)', i + 2);
      if (close !== -1) {
        out += text.slice(i, close + 2);
        i = close + 2;
        continue;
      }
    }
    const math = parseMathExpression(text, i);
    if (math) {
      out += text.slice(i, math.end);
      i = math.end;
      continue;
    }
    const footnote = parseHtmlTableFootnoteReference(text, i);
    if (footnote) {
      const index = footnotes.length;
      footnotes.push(footnote.id);
      const label = escapeHtmlAttribute(footnote.id);
      out += `<button type="button" data-html-table-footnote="${index}" aria-label="Open footnote ${label}">[${escapeHtmlText(footnote.id)}]</button>`;
      i = footnote.end;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/** Parse one footnote reference from an HTML-table text run. */
function parseHtmlTableFootnoteReference(
  text: string,
  from: number,
): { id: string; end: number } | null {
  if (!text.startsWith('[^', from)) return null;
  if (from > 0 && text[from - 1] === '\\') return null;
  const close = text.indexOf(']', from + 2);
  if (close === -1) return null;
  const id = text.slice(from + 2, close).trim();
  if (!id || id.includes('\0')) return null;
  return { id, end: close + 1 };
}

/** Escape a footnote id for an HTML attribute value. */
function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replaceAll('"', '&quot;');
}

/** Escape a footnote id for HTML text content. */
function escapeHtmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Count occurrences of a global HTML-tag regex in `text`. */
function countHtmlTableTagMatches(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  let count = 0;
  let match = pattern.exec(text);
  while (match) {
    count++;
    match = pattern.exec(text);
  }
  return count;
}

/** Parse a standalone `<center>...</center>` HTML fragment into centered blocks. */
export function parseCenterBlock(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode[] | null {
  if (ctx.index >= ctx.lines.length) return null;
  if (leadingIndent(ctx.lines[ctx.index]) !== baseIndent) return null;

  const firstLine = sliceIndent(ctx.lines[ctx.index], baseIndent).trim();
  if (!CENTER_OPEN_TAG_RE.test(firstLine)) return null;

  const openMatch = firstLine.match(CENTER_OPEN_TAG_RE);
  if (!openMatch) return null;

  let collected = firstLine.slice(openMatch[0].length);
  let consumed = 1;
  let closeSeen = CENTER_CLOSE_TAG_RE.test(collected);

  while (!closeSeen && ctx.index + consumed < ctx.lines.length) {
    const next = ctx.lines[ctx.index + consumed];
    if (leadingIndent(next) < baseIndent) return null;
    collected += `\n${sliceIndent(next, baseIndent).trim()}`;
    consumed++;
    closeSeen = CENTER_CLOSE_TAG_RE.test(collected);
    if (consumed > 32) return null;
  }

  if (!closeSeen) return null;

  const closeIndex = collected.search(CENTER_CLOSE_TAG_RE);
  if (closeIndex < 0) return null;
  const centerBody = collected.slice(0, closeIndex);
  const imageTagMatch = centerBody.match(IMG_TAG_RE);

  if (imageTagMatch) {
    const src = parseHtmlAttr(imageTagMatch[0], 'src');
    if (!src) return null;
    const alt = parseHtmlAttr(imageTagMatch[0], 'alt') ?? '';
    const maxWidthPx = parseHtmlWidthPx(
      parseHtmlAttr(imageTagMatch[0], 'width'),
    );

    ctx.index += consumed;
    const imageNode: InlineNode = { type: 'image', alt, url: src };
    if (maxWidthPx !== null) {
      imageNode.maxWidthPx = maxWidthPx;
    }
    return [
      {
        type: 'paragraph',
        children: [imageNode],
      },
    ];
  }

  ctx.index += consumed;
  const nested = ctx.parseNestedBlocks(centerBody.split('\n'));
  for (const block of nested) {
    if (block.type === 'paragraph') block.centered = true;
  }
  return nested;
}

/** Parse `<caption>...</caption>` content and return parsed caption blocks. */
export function parseCaptionBlock(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode[] | null {
  if (ctx.index >= ctx.lines.length) return null;
  if (leadingIndent(ctx.lines[ctx.index]) < baseIndent) return null;

  const firstLine = sliceIndent(ctx.lines[ctx.index], baseIndent).trim();
  if (!CAPTION_OPEN_RE.test(firstLine)) return null;

  const openTagMatch = firstLine.match(CAPTION_OPEN_RE);
  if (!openTagMatch) return null;

  const captionLines: string[] = [];
  let collected = firstLine.slice(openTagMatch[0].length);
  let consumed = 1;
  let closeMatch = collected.match(CAPTION_CLOSE_RE);

  while (!closeMatch && ctx.index + consumed < ctx.lines.length) {
    const next = ctx.lines[ctx.index + consumed];
    if (leadingIndent(next) < baseIndent) return null;
    captionLines.push(collected);
    collected = sliceIndent(next, baseIndent).trim();
    consumed++;
    closeMatch = collected.match(CAPTION_CLOSE_RE);
    if (consumed > 64) return null;
  }

  if (!closeMatch || closeMatch.index === undefined) return null;

  captionLines.push(collected.slice(0, closeMatch.index));
  ctx.index += consumed;
  return ctx.parseNestedBlocks(captionLines);
}

/** True when a line begins with a caption opening token at or past `baseIndent`. */
export function isCaptionStartLine(line: string, baseIndent: number): boolean {
  if (leadingIndent(line) < baseIndent) return false;
  return CAPTION_OPEN_RE.test(sliceIndent(line, baseIndent).trim());
}

/** Attach a caption to the previous standalone image or figure when possible. */
export function attachCaptionToPreviousFigure(
  blocks: BlockNode[],
  caption: BlockNode[],
): void {
  const previous = blocks[blocks.length - 1];
  if (!previous) {
    blocks.push(...caption);
    return;
  }

  if (previous.type === 'figure') {
    previous.caption = caption;
    return;
  }

  const image = extractStandaloneImage(previous);
  if (!image) {
    if (previous.type === 'paragraph' && previous.centered) {
      for (const block of caption) {
        if (block.type === 'paragraph') block.centered = true;
      }
    }
    blocks.push(...caption);
    return;
  }

  blocks[blocks.length - 1] = {
    type: 'figure',
    image,
    caption,
  };
}

/** Return the image when a block is exactly one standalone markdown image. */
function extractStandaloneImage(block: BlockNode): ImageNode | null {
  if (block.type !== 'paragraph') return null;
  if (block.children.length !== 1) return null;
  const only = block.children[0];
  if (only.type !== 'image') return null;
  return only;
}

/** True when `content` starts an explicit HTML table block. */
export function isHtmlTableStart(content: string): boolean {
  return HTML_TABLE_OPEN_RE.test(content.trimStart());
}

/** Check for a caption opening tag without consuming parser state. */
export function isCaptionBlockStart(content: string): boolean {
  return CAPTION_OPEN_RE.test(content.trim());
}
