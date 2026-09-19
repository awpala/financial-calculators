import { articleHeadingAndBody } from './renderer-helpers.js';
import type { BlockNode, InlineNode, MarkdownDocument } from '../types.js';

/** Locate the render-scope token for the first heading in document order. */
export function findFirstHeadingScope(doc: MarkdownDocument): string | null {
  return findFirstHeadingScopeInBlocks(doc.children, 'root');
}

/** Build a map of footnote-id to parsed block content from the document. */
export function buildFootnoteDefinitionMap(
  doc: MarkdownDocument,
): Map<string, BlockNode[]> {
  const out = new Map<string, BlockNode[]>();
  collectFootnoteDefinitions(doc.children, out);
  return out;
}

/**
 * Resolve a footnote definition relative to the clicked reference token.
 *
 * The renderer prefers the first matching definition that appears after the
 * reference in document order. When no later definition exists, it falls back
 * to the first matching definition anywhere in the document.
 */
export function resolveFootnoteDefinition(
  doc: MarkdownDocument,
  referenceToken: string,
  id: string,
): BlockNode[] | null {
  let sawReference = false;
  let resolved: BlockNode[] | null = null;

  visitBlocksInRenderOrder(doc.children, 'root', (node, scope) => {
    if (resolved) return;
    if (sawReference && node.type === 'footnoteDefinition' && node.id === id) {
      resolved = node.children;
      return;
    }
    if (
      node.type === 'htmlTable' &&
      isHtmlTableFootnoteReference(node, scope, referenceToken, id)
    ) {
      sawReference = true;
      return;
    }
    if (node.type === 'heading' || node.type === 'paragraph') {
      visitInlineNodesInRenderOrder(
        node.children,
        `${scope}.paragraph`,
        (inlineNode, inlineScope) => {
          if (
            inlineNode.type === 'footnoteReference' &&
            inlineNode.id === id &&
            inlineScope === referenceToken
          ) {
            sawReference = true;
          }
        },
      );
    }
  });

  if (resolved) return resolved;
  return buildFootnoteDefinitionMap(doc).get(id) ?? null;
}

/** Test whether a scoped HTML-table footnote token identifies `id`. */
function isHtmlTableFootnoteReference(
  node: Extract<BlockNode, { type: 'htmlTable' }>,
  scope: string,
  referenceToken: string,
  id: string,
): boolean {
  const prefix = `${scope}.html-footnote.`;
  if (!referenceToken.startsWith(prefix)) return false;
  const rawIndex = referenceToken.slice(prefix.length);
  if (!/^(0|[1-9]\d*)$/.test(rawIndex)) return false;
  return node.footnotes[Number(rawIndex)] === id;
}

function findFirstHeadingScopeInBlocks(
  nodes: BlockNode[],
  scope: string,
): string | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeScope = `${scope}.${i}`;
    if (node.type === 'heading') {
      return nodeScope;
    }
    const found = recurseIntoBlock(
      node,
      nodeScope,
      findFirstHeadingScopeInBlocks,
    );
    if (found) return found;
  }
  return null;
}

function collectFootnoteDefinitions(
  nodes: BlockNode[],
  out: Map<string, BlockNode[]>,
): void {
  for (const node of nodes) {
    if (node.type === 'footnoteDefinition') {
      if (!out.has(node.id)) {
        out.set(node.id, node.children);
      }
      continue;
    }
    recurseIntoBlock(node, '', (children) => {
      collectFootnoteDefinitions(children, out);
      return null;
    });
  }
}

/** Visit blocks in the same order the renderer emits them to the page. */
function visitBlocksInRenderOrder(
  nodes: BlockNode[],
  scope: string,
  visit: (node: BlockNode, scope: string) => void,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeScope = `${scope}.${i}`;
    visit(node, nodeScope);

    if (node.type === 'list') {
      for (let j = 0; j < node.items.length; j++) {
        const itemScope = node.ordered
          ? `${nodeScope}.ol.${j}`
          : `${nodeScope}.ul.${j}`;
        visitBlocksInRenderOrder(node.items[j].children, itemScope, visit);
      }
      continue;
    }

    if (node.type === 'blockquote') {
      visitBlocksInRenderOrder(node.children, `${nodeScope}.blockquote`, visit);
      continue;
    }

    if (node.type === 'callout') {
      visitBlocksInRenderOrder(node.children, `${nodeScope}.callout`, visit);
      continue;
    }

    if (node.type === 'footnoteDefinition') {
      visitBlocksInRenderOrder(node.children, `${nodeScope}.footnote`, visit);
      continue;
    }

    if (node.type === 'asideArticle') {
      visitBlocksInRenderOrder(
        articleHeadingAndBody(node.children).body,
        `${nodeScope}.article-body`,
        visit,
      );
      continue;
    }

    if (node.type === 'figure') {
      visitBlocksInRenderOrder(
        node.caption,
        `${nodeScope}.figure-caption`,
        visit,
      );
    }
  }
}

/** Visit inline nodes in the same scope order used by the inline renderer. */
function visitInlineNodesInRenderOrder(
  nodes: InlineNode[],
  scope: string,
  visit: (node: InlineNode, scope: string) => void,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeScope = `${scope}.${i}`;
    visit(node, nodeScope);

    if (
      node.type === 'bold' ||
      node.type === 'italic' ||
      node.type === 'strikethrough' ||
      node.type === 'link' ||
      node.type === 'superscript' ||
      node.type === 'subscript' ||
      node.type === 'underline' ||
      node.type === 'coloredText' ||
      node.type === 'definitionReference'
    ) {
      visitInlineNodesInRenderOrder(node.children, nodeScope, visit);
      continue;
    }

    if (node.type === 'embeddedBlocks') {
      visitBlocksInRenderOrder(node.blocks, `${scope}.embedded.${i}`, () => {});
    }
  }
}

function recurseIntoBlock<T>(
  node: BlockNode,
  scope: string,
  visit: (nodes: BlockNode[], scope: string) => T | null,
): T | null {
  if (node.type === 'list') {
    for (let j = 0; j < node.items.length; j++) {
      const listScope = node.ordered ? `${scope}.ol.${j}` : `${scope}.ul.${j}`;
      const found = visit(node.items[j].children, listScope);
      if (found) return found;
    }
    return null;
  }
  if (node.type === 'blockquote')
    return visit(node.children, `${scope}.blockquote`);
  if (node.type === 'callout') return visit(node.children, `${scope}.callout`);
  if (node.type === 'footnoteDefinition')
    return visit(node.children, `${scope}.footnote`);
  if (node.type === 'asideArticle') {
    return visit(
      articleHeadingAndBody(node.children).body,
      `${scope}.article-body`,
    );
  }
  if (node.type === 'figure')
    return visit(node.caption, `${scope}.figure-caption`);
  return null;
}
