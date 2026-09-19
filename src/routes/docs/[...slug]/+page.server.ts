import { error } from '@sveltejs/kit';
import { parse } from '#lib/markdown/parser.js';
import { extractHeadings } from '#lib/markdown/headings.js';
import { highlightCodeBlocks } from '#lib/server/highlight.js';
import { renderMermaidDiagrams } from '#lib/server/mermaid-document.js';
import { documentSource, listDocuments } from '#lib/server/documents.js';
import type { EntryGenerator, PageServerLoad } from './$types';

/** Enumerate even unlinked nested documents so a static build cannot omit them. */
export const entries: EntryGenerator = () =>
  listDocuments().map(({ slug }) => ({ slug }));

/** Prepare an owner-local AST; Shiki and Chromium never enter the browser bundle. */
export const load: PageServerLoad = async ({ params }) => {
  // Rest parameters include the trailing slash in this Kit release.
  const slug = params.slug.replace(/\/$/, '');
  const source = documentSource(slug);
  if (source === undefined) error(404, 'No such document.');
  const doc = parse(source);
  await renderMermaidDiagrams(doc);
  await highlightCodeBlocks(doc);
  const headings = extractHeadings(doc);
  return { doc, headings, title: headings[0]?.text ?? slug };
};
