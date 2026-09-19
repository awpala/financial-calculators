import type { BlockNode, MarkdownDocument } from './types.js';
import { flattenInlineText } from './renderers/node-text.js';

/**
 * A single heading entry parsed from a {@link MarkdownDocument}.
 *
 * `level` follows the standard HTML heading levels (1-6). `id` is the
 * anchor id assigned to the heading element so the TOC can link to it.
 */
export interface Heading {
  /** Anchor assigned to the rendered heading. */
  id: string;
  /** HTML heading depth used to derive navigation hierarchy. */
  level: number;
  /** Plain heading text with inline formatting removed. */
  text: string;
}

/**
 * Walk a {@link MarkdownDocument} and collect its headings in document order.
 *
 * The returned entries are flat — the table-of-contents component is
 * responsible for building any visual hierarchy from the `level` field.
 */
export function extractHeadings(doc: MarkdownDocument): Heading[] {
  const out: Heading[] = [];
  collectHeadings(doc.children, out);
  return out;
}

/** Walk nested block nodes and collect headings in document order. */
function collectHeadings(nodes: BlockNode[], out: Heading[]): void {
  for (const node of nodes) {
    if (node.type === 'heading') {
      out.push({
        id: node.id,
        level: node.level,
        text: flattenInlineText(node.children, { lineBreak: ' ' }),
      });
      continue;
    }

    if (node.type === 'blockquote') {
      collectHeadings(node.children, out);
      continue;
    }

    if (node.type === 'callout') {
      collectHeadings(node.children, out);
      continue;
    }

    if (node.type === 'asideArticle') {
      collectHeadings(node.children, out);
      continue;
    }

    if (node.type === 'list') {
      for (const item of node.items) {
        collectHeadings(item.children, out);
      }
    }
  }
}
