import type { BlockNode, CodeNode, InlineNode } from '../types.js';
import { parseHtmlDataAttributes, parseHtmlWidthPx } from './helpers.js';
import {
  findTagEnd,
  matchTag,
  parseInlineHtmlBlock,
  parseStyledSpan,
} from './inline-html.js';
import { parseTemplateReference } from './templates.js';

/** Dependencies and shared state used while parsing one run of inline markdown. */
export interface InlineParserContext {
  /** Document template definitions available for expansion. */
  templates: Map<string, string>;
  /** Expansion ancestry that prevents recursive template substitution. */
  visitedTemplateTokens: Set<string>;
  /** Optional shared heading counters for embedded block parsing. */
  idCounts?: Map<string, number>;
  /** Optional parser for block structures embedded in inline source. */
  parseNestedBlocks?: (
    lines: string[],
    visitedTemplateTokens: Set<string>,
  ) => BlockNode[];
}

/**
 * Parse a flat run of inline markdown text into an {@link InlineNode} tree.
 *
 * Recognizes inline links/images, code spans, bold, strikethrough,
 * simple inline HTML tags (`<sub>`, `<sup>`, `<b>`, `<i>`, `<s>`, `<code>`,
 * `<u>`), definition spans (`<span class="definition" data-term data-definition>`),
 * and italic text.
 * Inline markers may contain further nested inlines; unmatched markers
 * are emitted as literal text so malformed input still renders.
 */
export function parseInlineNodes(
  text: string,
  context: InlineParserContext,
): InlineNode[] {
  const out: InlineNode[] = [];
  let buf = '';
  let i = 0;

  /** Flush accumulated literal text into the output node list. */
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', value: decodeHtmlEntities(buf) });
      buf = '';
    }
  };

  /** Parse child content with the current template and document context. */
  const parseChildren = (value: string): InlineNode[] =>
    parseInlineNodes(value, context);

  while (i < text.length) {
    if (text[i] === '\n') {
      flush();
      out.push({ type: 'lineBreak' });
      i++;
      continue;
    }

    const lineBreakTag = /^<br\s*\/?>/i.exec(text.slice(i, i + 6));
    if (lineBreakTag) {
      flush();
      out.push({ type: 'lineBreak' });
      i += lineBreakTag[0].length;
      continue;
    }

    if (text[i] === '\\' && isEscapablePunctuation(text[i + 1])) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    const templateRef = parseTemplateReference(text, i);
    if (templateRef) {
      const content = context.templates.get(templateRef.token);
      if (
        content !== undefined &&
        !context.visitedTemplateTokens.has(templateRef.token)
      ) {
        flush();
        const nextVisited = new Set(context.visitedTemplateTokens);
        nextVisited.add(templateRef.token);

        if (context.idCounts && context.parseNestedBlocks) {
          const blocks = context.parseNestedBlocks(
            content.split('\n'),
            nextVisited,
          );
          if (blocks.length === 1 && blocks[0].type === 'paragraph') {
            out.push(...blocks[0].children);
          } else {
            out.push({ type: 'embeddedBlocks', blocks });
          }
        } else {
          out.push(
            ...parseInlineNodes(content, {
              ...context,
              visitedTemplateTokens: nextVisited,
            }),
          );
        }

        i = templateRef.end;
        continue;
      }
    }

    const footnoteRef = parseFootnoteReference(text, i);
    if (footnoteRef) {
      flush();
      out.push({ type: 'footnoteReference', id: footnoteRef.id });
      i = footnoteRef.end;
      continue;
    }

    if (text[i] === '`') {
      const ticks = markerRunLength(text, i, '`');
      const marker = '`'.repeat(ticks);
      const close = text.indexOf(marker, i + ticks);
      if (close !== -1) {
        flush();
        out.push({ type: 'code', value: text.slice(i + ticks, close) });
        i = close + ticks;
        continue;
      }
    }

    const math = parseMathExpression(text, i);
    if (math) {
      flush();
      if (math.display) {
        out.push({ type: 'mathDisplayInline', value: math.value });
      } else {
        out.push({ type: 'mathInline', value: math.value });
      }
      i = math.end;
      continue;
    }

    const linkOrImage = parseLinkOrImage(text, i);
    if (linkOrImage) {
      flush();
      if (linkOrImage.kind === 'image') {
        const image: InlineNode = {
          type: 'image',
          alt: linkOrImage.label,
          url: linkOrImage.url,
        };
        if (linkOrImage.maxWidthPx !== undefined) {
          image.maxWidthPx = linkOrImage.maxWidthPx;
        }
        out.push(image);
      } else {
        out.push({
          type: 'link',
          url: linkOrImage.url,
          children: parseChildren(linkOrImage.label),
        });
      }
      i = linkOrImage.end;
      continue;
    }

    const definitionSpan = parseDefinitionSpan(text, i);
    if (definitionSpan) {
      flush();
      out.push({
        type: 'definitionReference',
        term: definitionSpan.term,
        definition: parseChildren(definitionSpan.definition),
        children: parseChildren(definitionSpan.inner),
      });
      i = definitionSpan.end;
      continue;
    }

    const styledSpan = parseStyledSpan(text, i);
    if (styledSpan) {
      flush();
      const children = parseChildren(styledSpan.inner);
      if (styledSpan.color) {
        out.push({ type: 'coloredText', color: styledSpan.color, children });
      } else {
        out.push(...children);
      }
      i = styledSpan.end;
      continue;
    }

    const htmlBlock = parseInlineHtmlBlock(text, i, parseChildren);
    if (htmlBlock) {
      flush();
      out.push({ type: 'embeddedBlocks', blocks: htmlBlock.blocks });
      i = htmlBlock.end;
      continue;
    }

    const htmlTag = parseInlineHtmlTag(text, i);
    if (htmlTag) {
      flush();
      if (htmlTag.type === 'code') {
        out.push(parseInlineCodeContent(htmlTag.value));
      } else {
        out.push({
          type: htmlTag.type,
          children: parseChildren(htmlTag.value),
        });
      }
      i = htmlTag.end;
      continue;
    }

    if (text.startsWith('***', i)) {
      const close = findUnescapedDelimiter(text, '***', i + 3);
      if (close !== -1) {
        flush();
        out.push({
          type: 'italic',
          children: [
            {
              type: 'bold',
              children: parseChildren(text.slice(i + 3, close)),
            },
          ],
        });
        i = close + 3;
        continue;
      }
    }

    if (text.startsWith('**', i)) {
      const close = findUnescapedDelimiter(text, '**', i + 2);
      if (close !== -1) {
        flush();
        out.push({
          type: 'bold',
          children: parseChildren(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    }

    if (text.startsWith('~~', i)) {
      const close = findUnescapedDelimiter(text, '~~', i + 2);
      if (close !== -1) {
        flush();
        out.push({
          type: 'strikethrough',
          children: parseChildren(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    }

    if (text[i] === '*' && text[i + 1] !== '*' && text[i - 1] !== '*') {
      const close = findItalicClose(text, i + 1);
      if (close !== -1) {
        flush();
        out.push({
          type: 'italic',
          children: parseChildren(text.slice(i + 1, close)),
        });
        i = close + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }

  flush();
  return out;
}

/** Decode common HTML entities in plain text nodes. */
function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi,
    (full, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower === 'nbsp') return '\u00a0';
      if (lower === 'amp') return '&';
      if (lower === 'lt') return '<';
      if (lower === 'gt') return '>';
      if (lower === 'quot') return '"';
      if (lower === 'apos' || lower === '#39') return "'";

      if (lower.startsWith('#x')) {
        const codePoint = Number.parseInt(lower.slice(2), 16);
        return isValidCodePoint(codePoint)
          ? String.fromCodePoint(codePoint)
          : full;
      }

      if (lower.startsWith('#')) {
        const codePoint = Number.parseInt(lower.slice(1), 10);
        return isValidCodePoint(codePoint)
          ? String.fromCodePoint(codePoint)
          : full;
      }

      return full;
    },
  );
}

/**
 * True when `char` is an ASCII punctuation character that a preceding backslash
 * escapes into its literal form (CommonMark backslash escapes), e.g. `\*`, `\_`,
 * `\>`, `\<`, `\|`. A backslash before any other character is kept literally.
 */
function isEscapablePunctuation(char: string | undefined): boolean {
  return char !== undefined && /[!-/:-@[-`{-~]/.test(char);
}

/** True when `codePoint` is a valid Unicode scalar value. */
function isValidCodePoint(codePoint: number): boolean {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff;
}

/** Parsed inline math and the index immediately after its closing delimiter. */
export interface ParsedMathExpression {
  /** Whether the delimiter requests display-style typesetting. */
  display: boolean;
  /** LaTeX source without its delimiters. */
  value: string;
  /** Source offset immediately after the closing delimiter. */
  end: number;
}

/** Inline node types that a literal inline HTML formatting tag maps to. */
type InlineHtmlNodeType =
  | 'superscript'
  | 'subscript'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'underline'
  | 'code';

/**
 * Literal inline HTML formatting tags recognized in inline text, mapped to the
 * semantic inline node each produces.
 */
const INLINE_HTML_TAGS: Record<string, InlineHtmlNodeType> = {
  sup: 'superscript',
  sub: 'subscript',
  strong: 'bold',
  b: 'bold',
  em: 'italic',
  i: 'italic',
  del: 'strikethrough',
  s: 'strikethrough',
  code: 'code',
  u: 'underline',
};

/** Parsed literal inline HTML formatting tag. */
interface ParsedInlineHtmlTag {
  type: InlineHtmlNodeType;
  value: string;
  end: number;
}

/**
 * Build a {@link CodeNode} from the inner text of an inline `<code>` HTML tag.
 *
 * The content stays literal (like backtick code) with one exception: `<u>…</u>`
 * runs become underline children so authored markup such as
 * `<code><u>1100</u>0000</code>` underlines part of a code span.
 */
function parseInlineCodeContent(value: string): CodeNode {
  if (!value.includes('<u>')) {
    return { type: 'code', value };
  }

  const children: InlineNode[] = [];
  let buf = '';
  let i = 0;

  /** Flush accumulated literal code text into the child node list. */
  const flush = () => {
    if (buf) {
      children.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < value.length) {
    if (value.startsWith('<u>', i)) {
      const close = value.indexOf('</u>', i + 3);
      if (close !== -1) {
        flush();
        children.push({
          type: 'underline',
          children: [{ type: 'text', value: value.slice(i + 3, close) }],
        });
        i = close + 4;
        continue;
      }
    }
    buf += value[i];
    i++;
  }

  flush();
  return { type: 'code', value, children };
}

/** Parsed authored definition span. */
interface ParsedDefinitionSpan {
  term: string;
  definition: string;
  inner: string;
  end: number;
}

/** Parse an authored definition span beginning at `from`. */
function parseDefinitionSpan(
  text: string,
  from: number,
): ParsedDefinitionSpan | null {
  if (!text.startsWith('<span', from)) return null;
  const openEnd = findTagEnd(text, from);
  if (openEnd === -1) return null;
  const openTag = text.slice(from, openEnd + 1);
  const classMatch = openTag.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const classes = (classMatch?.[1] ?? classMatch?.[2] ?? '').split(/\s+/);
  if (!classes.includes('definition')) return null;
  const attrs = parseHtmlDataAttributes(openTag);
  const term = attrs['data-term'];
  const definition = attrs['data-definition'];
  if (!term || !definition) return null;
  const span = matchTag(text, 'span', from);
  if (!span) return null;
  return {
    term: decodeHtmlEntities(term),
    definition,
    inner: text.slice(span.contentStart, span.contentEnd),
    end: span.end,
  };
}

/** Parse a literal inline HTML formatting tag beginning at `from`. */
function parseInlineHtmlTag(
  text: string,
  from: number,
): ParsedInlineHtmlTag | null {
  if (text[from] !== '<') return null;
  for (const tag in INLINE_HTML_TAGS) {
    const open = `<${tag}>`;
    if (!text.startsWith(open, from)) continue;
    const closeTag = `</${tag}>`;
    const close = text.indexOf(closeTag, from + open.length);
    if (close === -1) continue;
    return {
      type: INLINE_HTML_TAGS[tag],
      value: text.slice(from + open.length, close),
      end: close + closeTag.length,
    };
  }
  return null;
}

/** Parse `$...$` and `$$...$$` expressions beginning at `from`. */
export function parseMathExpression(
  text: string,
  from: number,
): ParsedMathExpression | null {
  if (text[from] !== '$') return null;
  if (from > 0 && text[from - 1] === '\\') return null;

  if (text.startsWith('$$', from)) {
    const close = findUnescapedDelimiter(text, '$$', from + 2);
    if (close === -1) return null;
    const value = text.slice(from + 2, close).trim();
    if (!value) return null;
    return { display: true, value, end: close + 2 };
  }

  const close = findUnescapedDelimiter(text, '$', from + 1);
  if (close === -1) return null;
  const value = text.slice(from + 1, close).trim();
  if (!value) return null;
  return { display: false, value, end: close + 1 };
}

/** Find an unescaped delimiter token in `text` beginning at `from`. */
function findUnescapedDelimiter(
  text: string,
  token: string,
  from: number,
): number {
  for (let i = from; i <= text.length - token.length; i++) {
    if (!text.startsWith(token, i)) continue;
    if (i > 0 && text[i - 1] === '\\') continue;
    return i;
  }
  return -1;
}

/** Parsed footnote reference. */
interface ParsedFootnoteReference {
  id: string;
  end: number;
}

/** Parse `[^id]` footnote references at `from`. */
function parseFootnoteReference(
  text: string,
  from: number,
): ParsedFootnoteReference | null {
  if (!text.startsWith('[^', from)) return null;
  const close = text.indexOf(']', from + 2);
  if (close === -1) return null;
  const id = text.slice(from + 2, close).trim();
  if (!id) return null;
  return { id, end: close + 1 };
}

/** Parsed link or image. */
interface ParsedLinkOrImage {
  kind: 'link' | 'image';
  label: string;
  url: string;
  end: number;
  maxWidthPx?: number;
}

/** Parse `[label](url)` and `![alt](url)` beginning at `from`. */
function parseLinkOrImage(
  text: string,
  from: number,
): ParsedLinkOrImage | null {
  const isImage = text[from] === '!' && text[from + 1] === '[';
  const isLink = text[from] === '[';
  if (!isImage && !isLink) return null;

  const bracketIndex = isImage ? from + 1 : from;
  const labelStart = bracketIndex + 1;
  const labelEnd = findBalancedClose(text, labelStart, '[', ']');
  if (labelEnd === -1) return null;
  if (text[labelEnd + 1] !== '(') return null;

  const urlStart = labelEnd + 2;
  const urlEnd = findBalancedClose(text, urlStart, '(', ')');
  if (urlEnd === -1) return null;

  const label = text.slice(labelStart, labelEnd);
  const url = text.slice(urlStart, urlEnd).trim();
  if (!url) return null;

  let end = urlEnd + 1;
  let maxWidthPx: number | undefined;
  if (isImage) {
    const attrs = parseTrailingAttributeBlock(text, end);
    if (attrs) {
      end = attrs.end;
      const parsedWidth = parseHtmlWidthPx(attrs.attrs.get('width') ?? null);
      if (parsedWidth !== null) {
        maxWidthPx = parsedWidth;
      }
    }
  }

  return {
    kind: isImage ? 'image' : 'link',
    label,
    url,
    end,
    maxWidthPx,
  };
}

/** Parsed image attribute block. */
interface ParsedAttributeBlock {
  attrs: Map<string, string>;
  end: number;
}

/** Parse a trailing `{ key=value ... }` attribute block after markdown image syntax. */
function parseTrailingAttributeBlock(
  text: string,
  from: number,
): ParsedAttributeBlock | null {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] !== '{') return null;

  const close = text.indexOf('}', i + 1);
  if (close === -1) return null;
  const body = text.slice(i + 1, close).trim();
  if (!body) return null;

  const attrs = new Map<string, string>();
  for (const token of body.split(/\s+/)) {
    const eq = token.indexOf('=');
    if (eq <= 0) continue;
    const key = token.slice(0, eq).trim().toLowerCase();
    if (!key) continue;
    let value = token.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    attrs.set(key, value);
  }

  if (attrs.size === 0) return null;
  return { attrs, end: close + 1 };
}

/** Find a balanced closing marker while honoring nesting and escapes. */
function findBalancedClose(
  text: string,
  from: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === open) {
      depth++;
      continue;
    }
    if (ch !== close) continue;
    depth--;
    if (depth === 0) return i;
  }
  return -1;
}

/** Count a repeated marker run length beginning at `from`. */
function markerRunLength(text: string, from: number, marker: string): number {
  let len = 0;
  while (text[from + len] === marker) len++;
  return len;
}

/** Find a closing single `*` for italic, skipping `**` bold markers. */
function findItalicClose(text: string, from: number): number {
  for (let j = from; j < text.length; j++) {
    if (text[j] === '\\' && isEscapablePunctuation(text[j + 1])) {
      j++;
      continue;
    }

    const math = parseMathExpression(text, j);
    if (math) {
      j = math.end - 1;
      continue;
    }

    if (text[j] !== '*') continue;
    if (text[j + 1] === '*' || text[j - 1] === '*') continue;
    return j;
  }
  return -1;
}
