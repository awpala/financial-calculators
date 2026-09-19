/** Markdown source and the template definitions extracted from it. */
export interface TemplateExtractionResult {
  /** Markdown remaining after complete template definitions are removed. */
  source: string;
  /** Template token to source mapping, owned by this document parse. */
  templates: Map<string, string>;
}

/**
 * Extract `{{[TOKEN] ... }}` template blocks and return source without definitions.
 *
 * Definitions are standalone-line blocks that start with `{{[TOKEN]` and end at a
 * standalone `}}` line. Their content is injected where `{{[TOKEN]}}` references appear.
 */
export function extractTemplateDefinitions(
  source: string,
): TemplateExtractionResult {
  const lines = source.split('\n');
  const kept: string[] = [];
  const templates = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const startMatch = lines[i].trim().match(/^\{\{\[([^\]]+)\]\s*$/);
    if (!startMatch) {
      kept.push(lines[i]);
      continue;
    }

    const token = startMatch[1].trim();
    const contentLines: string[] = [];
    let endIndex = i + 1;
    let closed = false;

    while (endIndex < lines.length) {
      if (lines[endIndex].trim() === '}}') {
        closed = true;
        break;
      }
      contentLines.push(lines[endIndex]);
      endIndex++;
    }

    if (!closed) {
      kept.push(lines[i]);
      kept.push(...contentLines);
      i = endIndex - 1;
      continue;
    }

    if (token) {
      templates.set(token, contentLines.join('\n'));
    }
    i = endIndex;
  }

  return {
    source: kept.join('\n'),
    templates,
  };
}

/** A `{{[TOKEN]}}` reference and the source offset just past it. */
export interface TemplateReference {
  /** Trimmed token used to look up a template definition. */
  token: string;
  /** Source offset immediately after the reference token. */
  end: number;
}

/** Parse a `{{[TOKEN]}}` template reference beginning at `from`. */
export function parseTemplateReference(
  text: string,
  from: number,
): TemplateReference | null {
  if (!text.startsWith('{{[', from)) return null;
  const close = text.indexOf(']}}', from + 3);
  if (close === -1) return null;
  const token = text.slice(from + 3, close).trim();
  if (!token) return null;
  return { token, end: close + 3 };
}

/**
 * Substitute `{{[TOKEN]}}` references in `text` with their definition source.
 *
 * Expansion recurses so a template may reference another; an unknown token, or
 * one already being expanded, is kept literal so cycles terminate.
 */
export function expandTemplateReferences(
  text: string,
  templates: Map<string, string>,
  visitedTemplateTokens: Set<string> = new Set<string>(),
): string {
  let out = '';
  let i = 0;

  while (i < text.length) {
    const reference = parseTemplateReference(text, i);
    if (!reference) {
      out += text[i];
      i++;
      continue;
    }

    const content = templates.get(reference.token);
    if (content === undefined || visitedTemplateTokens.has(reference.token)) {
      out += text.slice(i, reference.end);
      i = reference.end;
      continue;
    }

    const nextVisited = new Set(visitedTemplateTokens);
    nextVisited.add(reference.token);
    out += expandTemplateReferences(content, templates, nextVisited);
    i = reference.end;
  }

  return out;
}
