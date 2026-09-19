import type {
  BlockNode,
  CodeBlockNode,
  InlineNode,
  MarkdownDocument,
} from '#lib/markdown/types.js';
import { renderMermaidSvg } from '#lib/server/mermaid-cli.js';

const MERMAID_RENDER_CONCURRENCY = 4;
let activeMermaidRenders = 0;
const mermaidRenderWaiters: Array<() => void> = [];

interface MermaidTarget {
  blocks: BlockNode[];
  index: number;
  node: CodeBlockNode;
}

/** Injected diagram renderer returning trusted SVG or rejecting on render failure. */
type MermaidRenderer = (definition: string) => Promise<string>;

/** Replace every Mermaid code block using a small bounded render pool. */
export async function renderMermaidDiagrams(
  doc: MarkdownDocument,
  render: MermaidRenderer = renderMermaidSvg,
  concurrency = MERMAID_RENDER_CONCURRENCY,
): Promise<void> {
  const targets: MermaidTarget[] = [];
  collectMermaidTargets(doc.children, targets);
  const workerCount = Math.min(
    Math.max(1, Math.floor(concurrency)),
    targets.length,
  );
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < targets.length) {
        const target = targets[nextIndex];
        nextIndex += 1;
        await renderMermaidTarget(target, render);
      }
    }),
  );
}

/** Render one Mermaid target and replace its source code node with the result. */
async function renderMermaidTarget(
  target: MermaidTarget,
  render: MermaidRenderer,
): Promise<void> {
  try {
    const svg = await withMermaidRenderSlot(() => render(target.node.value));
    target.blocks[target.index] = {
      type: 'mermaidDiagram',
      source: target.node.value,
      svg,
      error: null,
    };
  } catch (error) {
    target.blocks[target.index] = {
      type: 'mermaidDiagram',
      source: target.node.value,
      svg: null,
      error:
        error instanceof Error
          ? error.message
          : 'Mermaid diagram rendering failed.',
    };
  }
}

/** Run one diagram render within the process-wide concurrent-browser limit. */
async function withMermaidRenderSlot<T>(render: () => Promise<T>): Promise<T> {
  await acquireMermaidRenderSlot();
  try {
    return await render();
  } finally {
    releaseMermaidRenderSlot();
  }
}

/** Acquire or queue for one process-wide Mermaid render slot. */
async function acquireMermaidRenderSlot(): Promise<void> {
  if (activeMermaidRenders < MERMAID_RENDER_CONCURRENCY) {
    activeMermaidRenders += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    mermaidRenderWaiters.push(resolve);
  });
}

/** Release one Mermaid slot, transferring it directly to the oldest waiter. */
function releaseMermaidRenderSlot(): void {
  const next = mermaidRenderWaiters.shift();
  if (next) {
    next();
    return;
  }
  activeMermaidRenders -= 1;
}

/** Collect Mermaid code blocks and their owning arrays from a block subtree. */
function collectMermaidTargets(
  blocks: BlockNode[],
  targets: MermaidTarget[],
): void {
  for (let index = 0; index < blocks.length; index += 1) {
    const node = blocks[index];
    if (node.type === 'codeBlock' && node.language === 'mermaid') {
      targets.push({ blocks, index, node });
      continue;
    }
    if (node.type === 'heading' || node.type === 'paragraph') {
      collectMermaidTargetsFromInline(node.children, targets);
      continue;
    }
    if (node.type === 'table') {
      for (const cell of node.header.cells) {
        collectMermaidTargetsFromInline(cell.children, targets);
      }
      for (const row of node.rows) {
        for (const cell of row.cells) {
          collectMermaidTargetsFromInline(cell.children, targets);
        }
      }
      continue;
    }
    if (node.type === 'list') {
      for (const item of node.items) {
        collectMermaidTargets(item.children, targets);
      }
      continue;
    }
    if (node.type === 'figure') {
      collectMermaidTargets(node.caption, targets);
      continue;
    }
    if (
      node.type === 'blockquote' ||
      node.type === 'callout' ||
      node.type === 'asideArticle' ||
      node.type === 'footnoteDefinition'
    ) {
      collectMermaidTargets(node.children, targets);
    }
  }
}

/** Collect Mermaid targets nested inside inline formatting and embedded blocks. */
function collectMermaidTargetsFromInline(
  nodes: InlineNode[],
  targets: MermaidTarget[],
): void {
  for (const node of nodes) {
    if (node.type === 'embeddedBlocks') {
      collectMermaidTargets(node.blocks, targets);
      continue;
    }
    if (
      node.type === 'bold' ||
      node.type === 'italic' ||
      node.type === 'strikethrough' ||
      node.type === 'underline' ||
      node.type === 'coloredText' ||
      node.type === 'link' ||
      node.type === 'definitionReference' ||
      node.type === 'superscript' ||
      node.type === 'subscript'
    ) {
      collectMermaidTargetsFromInline(node.children, targets);
    }
  }
}
