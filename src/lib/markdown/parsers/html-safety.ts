import sanitizeHtml from 'sanitize-html';
import { linkTargetAttributes } from '#lib/navigation/links.js';

/**
 * Keep the table dialect's formatting and generated footnote controls while
 * removing executable markup, arbitrary CSS, and unsafe URL schemes. Called
 * after markdown expansion so generated HTML crosses the same boundary.
 */
export function sanitizeTableHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'table',
      'caption',
      'colgroup',
      'col',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'p',
      'div',
      'span',
      'br',
      'hr',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'code',
      'pre',
      'sub',
      'sup',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'button',
    ],
    allowedAttributes: {
      '*': ['class', 'title', 'data-align', 'data-class'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      col: ['span', 'width'],
      colgroup: ['span', 'width'],
      span: ['style'],
      ol: ['start', 'type'],
      a: ['href', 'target', 'rel'],
      img: [
        'src',
        'alt',
        'width',
        'height',
        'loading',
        'data-html-table-image',
      ],
      button: ['type', 'data-html-table-footnote', 'aria-label'],
    },
    allowedClasses: {
      '*': [
        'align-left',
        'align-center',
        'align-right',
        'align-top',
        'align-middle',
        'align-bottom',
        'align-baseline',
        'html-table-super-divider',
      ],
    },
    allowedStyles: { span: { color: [/^#[0-9a-f]{6}$/i] } },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (tagName, attributes) => {
        const { target, rel } =
          attributes.target === '_self'
            ? { target: '_self', rel: undefined }
            : linkTargetAttributes(attributes.href ?? '');
        return {
          tagName,
          attribs: {
            ...(target ? { target } : {}),
            ...(rel ? { rel } : {}),
            href: attributes.href ?? '',
          },
        };
      },
      button: sanitizeHtml.simpleTransform('button', { type: 'button' }),
    },
  });
}
