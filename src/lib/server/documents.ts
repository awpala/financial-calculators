import { parse } from '#lib/markdown/parser.js';
import { extractHeadings } from '#lib/markdown/headings.js';

// Authored source stays in the server graph. One catalog drives both navigation
// and prerendering, so adding an unlinked document cannot omit its static page.
const sources = import.meta.glob<string>('../../content/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Public document metadata; source content stays behind the server boundary. */
export type DocumentSummary = {
  /** Relative document path without the markdown extension. */
  slug: string;
  /** First heading, or the filename when a heading is absent. */
  title: string;
};

/** List every local document in stable slug order for navigation and prerendering. */
export function listDocuments(): DocumentSummary[] {
  return Object.entries(sources)
    .map(([path, source]) => {
      const slug = path.slice('../../content/docs/'.length, -3);
      return { slug, title: extractHeadings(parse(source))[0]?.text ?? slug };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Return an exact bundled source, or undefined; never treat a slug as a filesystem path. */
export function documentSource(slug: string): string | undefined {
  return sources[`../../content/docs/${slug}.md`];
}
