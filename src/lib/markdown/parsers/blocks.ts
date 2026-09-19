import type { BlockNode, HtmlTableNode, TableNode } from '../types.js';
import type { ParserContext } from './context.js';
import {
  leadingIndent,
  isThematicBreak,
  makeId,
  sliceIndent,
} from './helpers.js';
import {
  attachCaptionToPreviousFigure,
  isCaptionBlockStart,
  isCaptionStartLine,
  isFootnoteDefinitionStartLine,
  isHtmlTableStart,
  isStandaloneHtmlComment,
  markHtmlTableAsDenseContent,
  markHtmlTableFrozenColumns,
  parseCaptionBlock,
  parseCenterBlock,
  parseFootnoteDefinitionBlock,
  parseHtmlTableBlock,
} from './html-blocks.js';
import { parseInlineNodes } from './inline.js';
import {
  articleStartIndent,
  blockquoteStartIndent,
  fenceStartIndent,
  isArticleOpen,
  isMathBlockStart,
  parseAsideArticle,
  parseBlockquote,
  parseCodeBlock,
  parseFenceStart,
  parseList,
  parseListLine,
  parseMathBlock,
} from './structural-blocks.js';
import {
  markTableAsDenseContent,
  parseTable,
  tableStartIndent,
} from './tables.js';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const EXTRA_CONTENT_DECORATOR_RE =
  /^\s*<!--\s*data-is-extra-content\s*=\s*(["'])true\1\s*-->\s*$/;
const DENSE_CONTENT_TABLE_DECORATOR_RE =
  /^\s*<!--\s*data-is-dense-content-table\s*=\s*(["'])true\1\s*-->\s*$/;
const FREEZE_LEFT_COLUMNS_DECORATOR_RE =
  /^\s*<!--\s*data-freeze-cols-left-offset\s*=\s*(["'])(\d+)\1\s*-->\s*$/;

/** Read a freeze-columns decorator's one-based offset, or null when the line is not one. */
function freezeLeftColumnsOffset(line: string): number | null {
  const match = line.match(FREEZE_LEFT_COLUMNS_DECORATOR_RE);
  if (!match) return null;
  const offset = Number(match[2]);
  return offset > 0 ? offset : null;
}

/** Apply a pending freeze-columns decorator to a parsed pipe table. */
function withFrozenColumns(
  node: TableNode,
  frozenLeftColumns: number,
): TableNode {
  return frozenLeftColumns > 0 ? { ...node, frozenLeftColumns } : node;
}

/** Apply a pending freeze-columns decorator to an authored HTML table. */
function withFrozenHtmlColumns(
  node: HtmlTableNode,
  frozenLeftColumns: number,
): HtmlTableNode {
  return frozenLeftColumns > 0
    ? markHtmlTableFrozenColumns(node, frozenLeftColumns)
    : node;
}

/** Apply a pending dense-content decorator to an authored HTML table. */
function withDenseHtmlTable(
  node: HtmlTableNode,
  isDenseContentTable: boolean,
): HtmlTableNode {
  return isDenseContentTable ? markHtmlTableAsDenseContent(node) : node;
}

/** Parse block-level markdown lines with shared document state. */
export function parseBlockLines(
  lines: string[],
  idCounts: Map<string, number>,
  templates: Map<string, string>,
  visitedTemplateTokens: Set<string> = new Set<string>(),
  topLevel = false,
): BlockNode[] {
  const parseNestedBlocks = (
    nestedLines: string[],
    nestedVisitedTemplateTokens: Set<string> = visitedTemplateTokens,
  ): BlockNode[] =>
    parseBlockLines(
      nestedLines,
      idCounts,
      templates,
      nestedVisitedTemplateTokens,
      false,
    );

  const ctx: ParserContext = {
    lines,
    index: 0,
    idCounts,
    templates,
    visitedTemplateTokens,
    parseInline: (
      text: string,
      inlineVisitedTemplateTokens: Set<string> = visitedTemplateTokens,
    ) =>
      parseInlineNodes(text, {
        templates,
        visitedTemplateTokens: inlineVisitedTemplateTokens,
        idCounts,
        parseNestedBlocks,
      }),
    parseNestedBlocks,
  };

  return parseBlocks(ctx, 0, topLevel);
}

/** Parse block-level markdown lines at a specific indentation level. */
function parseBlocks(
  ctx: ParserContext,
  baseIndent: number,
  topLevel = false,
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let pendingExtraContent = false;
  let pendingDenseContentTable = false;
  let pendingFrozenLeftColumns = 0;

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') {
      ctx.index++;
      continue;
    }

    const indent = leadingIndent(line);
    if (indent < baseIndent) break;

    if (EXTRA_CONTENT_DECORATOR_RE.test(line)) {
      pendingExtraContent = true;
      ctx.index++;
      continue;
    }

    if (DENSE_CONTENT_TABLE_DECORATOR_RE.test(line)) {
      pendingDenseContentTable = true;
      ctx.index++;
      continue;
    }

    const freezeOffset = freezeLeftColumnsOffset(line);
    if (freezeOffset !== null) {
      pendingFrozenLeftColumns = freezeOffset;
      ctx.index++;
      continue;
    }

    const isExtraContent = pendingExtraContent;
    pendingExtraContent = false;
    const isDenseContentTable = pendingDenseContentTable;
    pendingDenseContentTable = false;
    const frozenLeftColumns = pendingFrozenLeftColumns;
    pendingFrozenLeftColumns = 0;

    const tableIndent = tableStartIndent(ctx, baseIndent);
    if (tableIndent !== null) {
      const table = parseTable(ctx, tableIndent);
      blocks.push(
        withFrozenColumns(
          isDenseContentTable ? markTableAsDenseContent(table) : table,
          frozenLeftColumns,
        ),
      );
      continue;
    }

    const articleIndent = articleStartIndent(ctx, baseIndent);
    if (articleIndent !== null) {
      blocks.push(parseAsideArticle(ctx, articleIndent));
      continue;
    }

    const content = sliceIndent(line, baseIndent);
    const listMatch = parseListLine(content);
    if (listMatch) {
      const listIndent = baseIndent + listMatch.leadingSpaces;
      blocks.push(parseList(ctx, listIndent, listMatch.ordered));
      continue;
    }

    const footnoteDefinition = parseFootnoteDefinitionBlock(ctx, baseIndent);
    if (footnoteDefinition) {
      blocks.push(footnoteDefinition);
      continue;
    }

    const captionBlocks = parseCaptionBlock(ctx, baseIndent);
    if (captionBlocks !== null) {
      attachCaptionToPreviousFigure(blocks, captionBlocks);
      continue;
    }

    if (indent === baseIndent) {
      const htmlTable = parseHtmlTableBlock(ctx, baseIndent);
      if (htmlTable) {
        blocks.push(
          withFrozenHtmlColumns(
            withDenseHtmlTable(htmlTable, isDenseContentTable),
            frozenLeftColumns,
          ),
        );
        continue;
      }

      const centerBlocks = parseCenterBlock(ctx, baseIndent);
      if (centerBlocks) {
        blocks.push(...centerBlocks);
        continue;
      }

      if (isArticleOpen(content)) {
        blocks.push(parseAsideArticle(ctx, baseIndent));
        continue;
      }

      if (isMathBlockStart(content)) {
        blocks.push(parseMathBlock(ctx, baseIndent));
        continue;
      }

      const fenceStart = parseFenceStart(content);
      if (fenceStart) {
        blocks.push(parseCodeBlock(ctx, baseIndent, fenceStart));
        continue;
      }

      if (isThematicBreak(content)) {
        blocks.push({ type: 'thematicBreak' });
        ctx.index++;
        continue;
      }

      const headingMatch = content.match(HEADING_RE);
      if (headingMatch) {
        const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = headingMatch[2].trimEnd();
        blocks.push({
          type: 'heading',
          level,
          id: makeId(text, ctx.idCounts),
          ...(isExtraContent ? { isExtraContent: true } : {}),
          children: ctx.parseInline(text),
        });
        ctx.index++;
        continue;
      }

      if (content.startsWith('>')) {
        blocks.push(parseBlockquote(ctx, baseIndent));
        continue;
      }
    }

    const fenceIndent = fenceStartIndent(line, baseIndent);
    if (fenceIndent !== null) {
      const fenceStart = parseFenceStart(line.slice(fenceIndent));
      if (fenceStart) {
        blocks.push(parseCodeBlock(ctx, fenceIndent, fenceStart));
        continue;
      }
    }

    const quoteIndent = blockquoteStartIndent(line, baseIndent);
    if (quoteIndent !== null) {
      blocks.push(parseBlockquote(ctx, quoteIndent));
      continue;
    }

    const htmlTable = parseHtmlTableBlock(ctx, baseIndent);
    if (htmlTable) {
      blocks.push(
        withFrozenHtmlColumns(
          withDenseHtmlTable(htmlTable, isDenseContentTable),
          frozenLeftColumns,
        ),
      );
      continue;
    }

    const paragraph = parseParagraph(ctx, baseIndent, topLevel);
    if (paragraph) {
      blocks.push(paragraph);
    }
  }

  return blocks;
}

/** Parse a paragraph, stopping at the next recognized block start. */
function parseParagraph(
  ctx: ParserContext,
  baseIndent: number,
  topLevel: boolean,
): BlockNode | null {
  const lines: string[] = [];

  while (ctx.index < ctx.lines.length) {
    const line = ctx.lines[ctx.index];
    if (line.trim() === '') break;

    const indent = leadingIndent(line);
    if (indent < baseIndent) break;

    if (lines.length > 0 && parseListLine(sliceIndent(line, baseIndent))) {
      break;
    }

    if (lines.length > 0 && isCaptionStartLine(line, baseIndent)) {
      break;
    }

    if (lines.length > 0 && isFootnoteDefinitionStartLine(line, baseIndent)) {
      break;
    }

    if (lines.length > 0 && articleStartIndent(ctx, baseIndent) !== null) {
      break;
    }

    if (lines.length > 0 && startsStandaloneBlock(ctx, baseIndent)) {
      break;
    }

    lines.push(sliceIndent(line, baseIndent).trim());
    ctx.index++;
  }

  const text = lines.join(' ');
  if (topLevel && isStandaloneHtmlComment(text)) {
    return null;
  }

  return {
    type: 'paragraph',
    children: ctx.parseInline(text),
  };
}

/** True when the current line begins a non-paragraph block at `baseIndent`. */
function startsStandaloneBlock(
  ctx: ParserContext,
  baseIndent: number,
): boolean {
  if (ctx.index >= ctx.lines.length) return false;
  const line = ctx.lines[ctx.index];
  if (line.trim() === '') return false;
  const indent = leadingIndent(line);
  if (indent < baseIndent) return false;

  const content = sliceIndent(line, baseIndent);
  if (EXTRA_CONTENT_DECORATOR_RE.test(content)) return true;
  if (DENSE_CONTENT_TABLE_DECORATOR_RE.test(content)) return true;
  if (FREEZE_LEFT_COLUMNS_DECORATOR_RE.test(content)) return true;
  if (parseListLine(content)) return true;
  if (isHtmlTableStart(content)) return true;
  const indentedFenceStart = fenceStartIndent(line, baseIndent);
  if (indentedFenceStart !== null) return true;
  if (blockquoteStartIndent(line, baseIndent) !== null) return true;
  if (indent !== baseIndent) return false;

  const anyTableIndent = tableStartIndent(ctx, baseIndent);

  return Boolean(
    isThematicBreak(content) ||
    isArticleOpen(content) ||
    isCaptionBlockStart(content) ||
    isMathBlockStart(content) ||
    parseFenceStart(content) ||
    content.match(HEADING_RE) ||
    content.startsWith('>') ||
    anyTableIndent !== null,
  );
}
