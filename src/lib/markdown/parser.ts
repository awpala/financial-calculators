import type { InlineNode, MarkdownDocument } from './types.js';
import { parseBlockLines } from './parsers/blocks.js';
import { parseInlineNodes } from './parsers/inline.js';
import { extractTemplateDefinitions } from './parsers/templates.js';

/**
 * Parse a markdown source string into a {@link MarkdownDocument}.
 *
 * The parser supports the constructs rendered by this app and delegates block,
 * inline, HTML, table, structural, and template concerns to focused subparsers.
 */
export function parse(source: string): MarkdownDocument {
  const normalizedSource = source.replace(/\r\n?/g, '\n');
  const extracted = extractTemplateDefinitions(normalizedSource);

  return {
    children: parseBlockLines(
      extracted.source.split('\n'),
      new Map<string, number>(),
      extracted.templates,
      new Set<string>(),
      true,
    ),
  };
}

/** Parse a flat run of inline markdown into an {@link InlineNode} tree. */
export function parseInline(
  text: string,
  templates: Map<string, string> = new Map<string, string>(),
  visitedTemplateTokens: Set<string> = new Set<string>(),
  idCounts?: Map<string, number>,
): InlineNode[] {
  return parseInlineNodes(text, {
    templates,
    visitedTemplateTokens,
    idCounts,
    parseNestedBlocks: idCounts
      ? (lines, nestedVisitedTemplateTokens) =>
          parseBlockLines(
            lines,
            idCounts,
            templates,
            nestedVisitedTemplateTokens,
          )
      : undefined,
  });
}
