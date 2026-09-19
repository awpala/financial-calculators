import type { BlockNode, InlineNode } from '../types.js';
import { flattenBlockText, flattenInlineText } from './node-text.js';

const TABLE_CELL_FLOW_CLASS = 'whitespace-normal break-normal';

/** Flatten an inline subtree into plain text for semantic checks. */
export function inlinePlainText(nodes: InlineNode[]): string {
  return flattenInlineText(nodes);
}

/** Return plain text for simple block nodes, primarily embedded block labels. */
export function blockPlainText(node: BlockNode): string {
  const text = flattenBlockText(node);
  return node.type === 'list' ? text.trim() : text;
}

/** Return the character length of a nested inline subtree. */
export function inlineTextLength(nodes: InlineNode[]): number {
  let length = 0;
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'code') {
      length += node.value.length;
      continue;
    }
    if (node.type === 'lineBreak') {
      length += 1;
      continue;
    }
    if (node.type === 'image') {
      length += node.alt.length;
      continue;
    }
    if (node.type === 'footnoteReference') {
      continue;
    }
    if (node.type === 'mathInline' || node.type === 'mathDisplayInline') {
      length += node.value.length;
      continue;
    }
    if (node.type === 'embeddedBlocks') {
      for (const block of node.blocks) {
        length += blockPlainText(block).length;
      }
      continue;
    }

    length += inlineTextLength(node.children);
  }
  return length;
}

/** Count readable words using whitespace tokenization. */
export function wordCountFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** True when a paragraph is exactly `**Equation (...)**`/`**Eqution (...)**`. */
export function isCenteredEquationLabel(children: InlineNode[]): boolean {
  if (children.length !== 1) return false;
  const only = children[0];
  if (only.type !== 'bold') return false;
  const text = inlinePlainText(only.children).trim();
  return /^eq(?:uation|ution)\s*\([^)]+\)$/i.test(text);
}

/** Paragraph class with equation-label centering support. */
export function paragraphClass(
  children: InlineNode[],
  centered = false,
): string {
  const base = 'my-3 leading-relaxed text-slate-700 dark:text-slate-300';
  return centered || isCenteredEquationLabel(children)
    ? `${base} text-center`
    : base;
}

/** Wrap table cell content only at natural word boundaries. */
export function tableCellFlowClass(): string {
  return TABLE_CELL_FLOW_CLASS;
}
