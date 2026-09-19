import type { BlockNode, InlineNode } from '../types.js';

/** Separators used when flattening AST content to plain text. */
export interface InlineTextOptions {
  /** Replacement for hard line breaks; defaults to a newline. */
  lineBreak?: string;
  /** Separator after flattened embedded blocks; defaults to one space. */
  embeddedBlockSeparator?: string;
}

/**
 * Flatten inline nodes into human-readable text.
 *
 * `lineBreak` controls how hard breaks are represented.
 * `embeddedBlockSeparator` controls how embedded block chunks concatenate.
 */
export function flattenInlineText(
  nodes: readonly InlineNode[],
  options: InlineTextOptions = {},
): string {
  const lineBreak = options.lineBreak ?? '\n';
  const embeddedBlockSeparator = options.embeddedBlockSeparator ?? ' ';

  let out = '';
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'code') {
      out += node.value;
      continue;
    }
    if (node.type === 'lineBreak') {
      out += lineBreak;
      continue;
    }
    if (node.type === 'image') {
      out += node.alt;
      continue;
    }
    if (node.type === 'footnoteReference') {
      continue;
    }
    if (node.type === 'mathInline' || node.type === 'mathDisplayInline') {
      out += node.value;
      continue;
    }
    if (node.type === 'embeddedBlocks') {
      for (const block of node.blocks) {
        const text = flattenEmbeddedBlockText(
          block,
          lineBreak,
          embeddedBlockSeparator,
        );
        if (text) out += `${text}${embeddedBlockSeparator}`;
      }
      continue;
    }

    if (hasInlineChildren(node)) {
      out += flattenInlineText(node.children, options);
    }
  }

  return out;
}

/**
 * Flatten a block node into text.
 * Used for generic fallback extraction where callers accept plain text from
 * mixed block containers.
 */
export function flattenBlockText(node: BlockNode): string {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return flattenInlineText(node.children);
  }

  if (node.type === 'list') {
    let out = '';
    for (const item of node.items) {
      for (const child of item.children) {
        out += `${flattenBlockText(child)} `;
      }
    }
    return out.trimEnd();
  }

  return '';
}

function flattenEmbeddedBlockText(
  block: BlockNode,
  lineBreak: string,
  separator: string,
): string {
  if (block.type === 'paragraph' || block.type === 'heading') {
    return flattenInlineText(block.children, {
      lineBreak,
      embeddedBlockSeparator: separator,
    }).trim();
  }

  if (block.type === 'list') {
    let out = '';
    for (const item of block.items) {
      for (const child of item.children) {
        if (child.type === 'paragraph') {
          out += `${flattenInlineText(child.children, { lineBreak, embeddedBlockSeparator: separator })} `;
        }
      }
    }
    return out.trim();
  }

  return '';
}

function hasInlineChildren(
  node: InlineNode,
): node is InlineNode & { children: InlineNode[] } {
  return (
    'children' in node &&
    Array.isArray((node as { children?: unknown }).children)
  );
}
