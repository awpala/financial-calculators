/**
 * Link policy shared by every place the app renders an anchor.
 *
 * Docs are authored with a mix of in-corpus references and outbound citations.
 * Outbound links leave the reader's place in the document, so they open in a new
 * tab; anything that resolves inside the app stays in the current one.
 */

/** Shared prose-link styling, so authored and app links look identical. */
export const LINK_CLASS =
  'text-blue-700 underline decoration-blue-400/70 underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:decoration-blue-500/60 dark:hover:text-blue-200';

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Accept web, mail, telephone, and relative destinations from authored content.
 * URL parsing normalizes control characters before the scheme is checked;
 * rejected destinations become an inert in-page link.
 */
export function safeLinkHref(href: string): string {
  try {
    const url = new URL(href, 'https://app.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
      ? href
      : '#';
  } catch {
    return '#';
  }
}

/**
 * Report whether `href` leaves the app.
 *
 * Absolute URLs and protocol-relative URLs are outbound; in-page anchors and
 * relative or root-relative paths resolve against this app.
 */
export function isExternalUrl(href: string): boolean {
  const value = href.trim();
  if (!value || value.startsWith('#')) return false;
  if (value.startsWith('//')) return true;
  return ABSOLUTE_URL_RE.test(value);
}

/** Anchor target and rel for `href`, per {@link isExternalUrl}. */
export function linkTargetAttributes(href: string): {
  /** New browsing context for outbound links; absent for in-app links. */
  target: string | undefined;
  /** Prevent the outbound page from controlling this window or receiving its referrer. */
  rel: string | undefined;
} {
  return isExternalUrl(href)
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : { target: undefined, rel: undefined };
}
