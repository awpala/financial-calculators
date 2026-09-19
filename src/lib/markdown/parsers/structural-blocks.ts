import type {
  BlockNode,
  CalloutKind,
  ListItemNode,
  OrderedListMarkerKind,
} from '../types.js';
import type {
  CodeFenceStart,
  ListLineMatch,
  ParserContext,
} from './context.js';
import {
  columnWidth,
  leadingIndent,
  parseHtmlDataAttributes,
  sliceIndent,
} from './helpers.js';

const CALLOUT_MARKER_RE = /^\[!(NOTE|IMPORTANT|WARNING|CAUTION|TIP)\]\s*$/i;
const ARTICLE_OPEN_RE = /^<article\b[^>]*>\s*$/i;
const ARTICLE_CLOSE_RE = /^<\/article>\s*$/i;

/** Parse an ordered or unordered list at `baseIndent`. */
export function parseList(
  ctx: ParserContext,
  baseIndent: number,
  ordered: boolean,
): BlockNode {
  const items: ListItemNode[] = [];
  let markerKind: OrderedListMarkerKind | undefined;
  let start: number | undefined;

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') break;
    if (leadingIndent(line) !== baseIndent) break;

    const match = parseListLine(sliceIndent(line, baseIndent));
    if (!match || match.ordered !== ordered) break;
    if (ordered) {
      if (markerKind !== undefined && match.markerKind !== markerKind) break;
      markerKind ??= match.markerKind;
      start ??= match.markerValue;
    }
    items.push(parseListItem(ctx, baseIndent, match));
  }

  return { type: 'list', ordered, markerKind, start, items };
}

/** Parse one list item and recursively parse its nested block content. */
function parseListItem(
  ctx: ParserContext,
  baseIndent: number,
  match: ListLineMatch,
): ListItemNode {
  const itemIndent = baseIndent + match.markerWidth;
  const itemLines: string[] = [];

  if (match.text.trim() !== '') {
    itemLines.push(match.text);
  }

  ctx.index++;

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') {
      itemLines.push('');
      ctx.index++;
      continue;
    }

    const indent = leadingIndent(line);
    if (indent < itemIndent) break;

    if (indent === baseIndent) {
      const sibling = parseListLine(sliceIndent(line, baseIndent));
      if (sibling && sibling.ordered === match.ordered) {
        break;
      }
    }

    itemLines.push(sliceIndent(line, itemIndent));
    ctx.index++;
  }

  const children = ctx.parseNestedBlocks(itemLines);
  if (children.length > 0) {
    return { type: 'listItem', children };
  }

  return {
    type: 'listItem',
    children: [{ type: 'paragraph', children: [] }],
  };
}

/** Parse a blockquote and recursively parse its quoted content. */
export function parseBlockquote(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode {
  const quoteLines: string[] = [];

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') {
      if (shouldSplitSuccessiveCallouts(ctx, baseIndent, quoteLines)) {
        break;
      }
      quoteLines.push('');
      ctx.index++;
      continue;
    }

    if (leadingIndent(line) < baseIndent) break;
    const content = sliceIndent(line, baseIndent);
    if (!content.startsWith('>')) break;

    let stripped = content.slice(1);
    if (stripped.startsWith(' ')) stripped = stripped.slice(1);
    quoteLines.push(stripped);
    ctx.index++;
  }

  const callout = parseCalloutKind(quoteLines);
  if (callout) {
    return {
      type: 'callout',
      kind: callout.kind,
      children: ctx.parseNestedBlocks(callout.bodyLines),
    };
  }

  return {
    type: 'blockquote',
    children: ctx.parseNestedBlocks(quoteLines),
  };
}

/** True when a blank line separates the current callout from a following callout. */
function shouldSplitSuccessiveCallouts(
  ctx: ParserContext,
  baseIndent: number,
  quoteLines: string[],
): boolean {
  if (quoteLines.length === 0) return false;
  if (!parseCalloutMarker(quoteLines[0])) return false;

  let lookahead = ctx.index + 1;
  while (lookahead < ctx.lines.length && ctx.lines[lookahead].trim() === '') {
    lookahead++;
  }
  if (lookahead >= ctx.lines.length) return false;

  const nextLine = ctx.lines[lookahead];
  if (leadingIndent(nextLine) < baseIndent) return false;
  const content = sliceIndent(nextLine, baseIndent);
  if (!content.startsWith('>')) return false;

  let stripped = content.slice(1);
  if (stripped.startsWith(' ')) stripped = stripped.slice(1);
  return parseCalloutMarker(stripped) !== null;
}

/** Parse one callout marker line into its callout kind. */
function parseCalloutMarker(line: string): CalloutKind | null {
  const match = line.trim().match(CALLOUT_MARKER_RE);
  if (!match) return null;
  return match[1].toLowerCase() as CalloutKind;
}

/** Parse a GitHub-style callout marker and its remaining quote body. */
function parseCalloutKind(
  lines: string[],
): { kind: CalloutKind; bodyLines: string[] } | null {
  if (lines.length === 0) return null;
  const kind = parseCalloutMarker(lines[0]);
  if (!kind) return null;

  return {
    kind,
    bodyLines: lines.slice(1),
  };
}

/** Parse a custom `<article>...</article>` aside block at `baseIndent`. */
export function parseAsideArticle(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode {
  const openTag = sliceIndent(ctx.lines[ctx.index], baseIndent).trim();
  const dataAttributes = parseHtmlDataAttributes(openTag);
  ctx.index++;
  const articleLines: string[] = [];
  let depth = 1;

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    const indent = leadingIndent(line);
    const content = indent >= baseIndent ? sliceIndent(line, baseIndent) : line;

    if (isArticleOpen(content)) {
      depth++;
      articleLines.push(content);
      ctx.index++;
      continue;
    }

    if (isArticleClose(content)) {
      depth--;
      ctx.index++;
      if (depth === 0) {
        break;
      }
      articleLines.push(content);
      continue;
    }

    articleLines.push(content);
    ctx.index++;
  }

  return {
    type: 'asideArticle',
    dataAttributes,
    children: ctx.parseNestedBlocks(articleLines),
  };
}

/** Parse a standalone `$$...$$` math block at `baseIndent`. */
export function parseMathBlock(
  ctx: ParserContext,
  baseIndent: number,
): BlockNode {
  const line = ctx.lines[ctx.index];
  const content = sliceIndent(line, baseIndent);
  const trimmed = content.trim();

  let value = '';
  if (trimmed !== '$$') {
    if (trimmed.endsWith('$$') && trimmed.length > 4) {
      value = trimmed.slice(2, -2).trim();
      ctx.index++;
      return { type: 'mathBlock', value };
    }

    value = trimmed.slice(2).trim();
  }

  ctx.index++;
  const lines: string[] = value ? [value] : [];

  while (ctx.index < ctx.lines.length) {
    const nextLine = ctx.lines[ctx.index];
    const nextIndent = leadingIndent(nextLine);
    if (nextIndent < baseIndent) break;

    const nextContent = sliceIndent(nextLine, baseIndent);
    const nextTrimmed = nextContent.trim();
    if (nextTrimmed === '$$') {
      ctx.index++;
      break;
    }

    if (nextTrimmed.endsWith('$$')) {
      lines.push(nextTrimmed.slice(0, -2).trimEnd());
      ctx.index++;
      break;
    }

    lines.push(nextContent);
    ctx.index++;
  }

  return {
    type: 'mathBlock',
    value: lines.join('\n').trim(),
  };
}

/** Parse one fenced code block at `baseIndent`. */
export function parseCodeBlock(
  ctx: ParserContext,
  baseIndent: number,
  start: CodeFenceStart,
): BlockNode {
  ctx.index++;
  const lines: string[] = [];

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    const indent = leadingIndent(line);
    const content = indent >= baseIndent ? sliceIndent(line, baseIndent) : line;
    if (isFenceClose(content, start)) {
      ctx.index++;
      break;
    }
    lines.push(content);
    ctx.index++;
  }

  return {
    type: 'codeBlock',
    language: start.language,
    value: lines.join('\n'),
  };
}

/** Return the article indent at the current line, or null if no article starts here. */
export function articleStartIndent(
  ctx: ParserContext,
  baseIndent: number,
): number | null {
  if (ctx.index >= ctx.lines.length) return null;
  const indent = leadingIndent(ctx.lines[ctx.index]);
  if (indent < baseIndent) return null;
  if (!isArticleOpen(sliceIndent(ctx.lines[ctx.index], indent))) return null;
  return indent;
}

/** Parse one potential list marker line and return marker metadata. */
export function parseListLine(content: string): ListLineMatch | null {
  const unordered = content.match(/^(\s*)[-*+]\s+(.*)$/);
  if (unordered) {
    return {
      ordered: false,
      text: unordered[2],
      leadingSpaces: columnWidth(unordered[1]),
      markerWidth: columnWidth(
        unordered[0].slice(0, unordered[0].length - unordered[2].length),
      ),
    };
  }

  const ordered = content.match(/^(\s*)(\d+|[A-Za-z])[.)]\s+(.*)$/);
  if (ordered) {
    return {
      ordered: true,
      text: ordered[3],
      leadingSpaces: columnWidth(ordered[1]),
      markerWidth: columnWidth(
        ordered[0].slice(0, ordered[0].length - ordered[3].length),
      ),
      markerKind: orderedMarkerKind(ordered[2]),
      markerValue: orderedMarkerValue(ordered[2]),
    };
  }

  return null;
}

/** Classify an ordered-list marker token. */
function orderedMarkerKind(token: string): OrderedListMarkerKind {
  if (/^\d/.test(token)) return 'decimal';
  return token === token.toLowerCase() ? 'lower-alpha' : 'upper-alpha';
}

/** Resolve the ordinal an ordered-list marker token counts from. */
function orderedMarkerValue(token: string): number {
  if (/^\d/.test(token)) return Number.parseInt(token, 10);
  return token.toLowerCase().charCodeAt(0) - 96;
}

/** True when `content` begins a standalone display-math block. */
export function isMathBlockStart(content: string): boolean {
  return content.trimStart().startsWith('$$');
}

/** True when `content` is an opening `<article>` marker. */
export function isArticleOpen(content: string): boolean {
  return ARTICLE_OPEN_RE.test(content.trim());
}

/** True when `content` is a closing `</article>` marker. */
function isArticleClose(content: string): boolean {
  return ARTICLE_CLOSE_RE.test(content.trim());
}

/** Parse a fenced-code opening line and extract its language info string. */
export function parseFenceStart(content: string): CodeFenceStart | null {
  const trimmed = content.trimStart();
  if (trimmed.length < 3) return null;

  let fenceChar: '`' | '~' | null = null;
  if (trimmed.startsWith('```')) fenceChar = '`';
  if (trimmed.startsWith('~~~')) fenceChar = '~';
  if (!fenceChar) return null;

  let fenceLength = 0;
  while (trimmed[fenceLength] === fenceChar) {
    fenceLength++;
  }
  if (fenceLength < 3) return null;

  const info = trimmed.slice(fenceLength).trim();
  const language = info ? info.split(/\s+/)[0].toLowerCase() : null;
  return { fenceChar, fenceLength, language };
}

/** True when a line closes the active fenced-code block. */
function isFenceClose(content: string, start: CodeFenceStart): boolean {
  const trimmed = content.trimStart();
  let run = 0;
  while (trimmed[run] === start.fenceChar) {
    run++;
  }
  if (run < start.fenceLength) return false;
  return trimmed.slice(run).trim() === '';
}

/** Return an opening-fence indent within three spaces of `baseIndent`. */
export function fenceStartIndent(
  line: string,
  baseIndent: number,
): number | null {
  const indent = leadingIndent(line);
  if (indent < baseIndent || indent > baseIndent + 3) return null;
  return parseFenceStart(sliceIndent(line, indent)) ? indent : null;
}

/** Return a blockquote indent within three spaces of `baseIndent`. */
export function blockquoteStartIndent(
  line: string,
  baseIndent: number,
): number | null {
  const indent = leadingIndent(line);
  if (indent < baseIndent || indent > baseIndent + 3) return null;
  return sliceIndent(line, indent).startsWith('>') ? indent : null;
}
