import { createHighlighter } from 'shiki';
import type { BundledLanguage, Highlighter } from 'shiki';

import type {
  BlockNode,
  CodeBlockNode,
  InlineNode,
  MarkdownDocument,
} from '#lib/markdown/types.js';

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';
const CODE_LANGUAGES = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'dockerfile',
  'go',
  'html',
  'java',
  'javascript',
  'json',
  'jsx',
  'kotlin',
  'markdown',
  'php',
  'powershell',
  'python',
  'rust',
  'sql',
  'svelte',
  'swift',
  'toml',
  'tsx',
  'typescript',
  'xml',
  'yaml',
] satisfies BundledLanguage[];
const loadedCodeLanguages = new Set<string>(CODE_LANGUAGES);

let highlighterPromise: Promise<Highlighter> | null = null;

/** Normalize authored language aliases to canonical Shiki grammar ids. */
export function normalizeCodeLanguage(language: string | null): string {
  if (!language) return 'text';
  const key = language.trim().toLowerCase();
  if (!key) return 'text';
  const alias: Record<string, string> = {
    cs: 'csharp',
    'c#': 'csharp',
    js: 'javascript',
    ts: 'typescript',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    yml: 'yaml',
    md: 'markdown',
    plaintext: 'text',
    plain: 'text',
    txt: 'text',
  };
  return alias[key] ?? key;
}

/** Attach dual-theme Shiki HTML to every code block in a markdown document. */
export async function highlightCodeBlocks(
  doc: MarkdownDocument,
): Promise<void> {
  const nodes: CodeBlockNode[] = [];
  collectCodeBlocks(doc.children, nodes);
  if (nodes.length === 0) return;

  const highlighter = await getHighlighter();
  for (const node of nodes) {
    node.highlightedHtml = renderHighlightedCode(highlighter, node);
  }
}

/** Create the process-wide highlighter once with only the supported documentation grammars. */
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [LIGHT_THEME, DARK_THEME],
    langs: CODE_LANGUAGES,
  });
  return highlighterPromise;
}

/** Render one code block with CSS variables for light and dark themes. */
function renderHighlightedCode(
  highlighter: Highlighter,
  node: CodeBlockNode,
): string {
  const normalized = normalizeCodeLanguage(node.language);
  const language = loadedCodeLanguages.has(normalized) ? normalized : 'text';
  return highlighter.codeToHtml(node.value, {
    lang: language,
    themes: {
      light: LIGHT_THEME,
      dark: DARK_THEME,
    },
  });
}

/** Collect code blocks from a block subtree in document order. */
function collectCodeBlocks(nodes: BlockNode[], out: CodeBlockNode[]): void {
  for (const node of nodes) {
    if (node.type === 'codeBlock') {
      out.push(node);
      continue;
    }
    if (node.type === 'heading' || node.type === 'paragraph') {
      collectCodeBlocksFromInline(node.children, out);
      continue;
    }
    if (node.type === 'table') {
      for (const cell of node.header.cells) {
        collectCodeBlocksFromInline(cell.children, out);
      }
      for (const row of node.rows) {
        for (const cell of row.cells) {
          collectCodeBlocksFromInline(cell.children, out);
        }
      }
      continue;
    }
    if (node.type === 'list') {
      for (const item of node.items) {
        collectCodeBlocks(item.children, out);
      }
      continue;
    }
    if (node.type === 'figure') {
      collectCodeBlocks(node.caption, out);
      continue;
    }
    if (
      node.type === 'blockquote' ||
      node.type === 'callout' ||
      node.type === 'asideArticle' ||
      node.type === 'footnoteDefinition'
    ) {
      collectCodeBlocks(node.children, out);
    }
  }
}

/** Collect code blocks nested inside inline formatting and embedded block nodes. */
function collectCodeBlocksFromInline(
  nodes: InlineNode[],
  out: CodeBlockNode[],
): void {
  for (const node of nodes) {
    if (node.type === 'embeddedBlocks') {
      collectCodeBlocks(node.blocks, out);
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
      collectCodeBlocksFromInline(node.children, out);
    }
  }
}
