/** Executable MathJax CDN version used by the browser runtime and asset coordinates. */
export const MATHJAX_VERSION = '3.2.2';
/** CDN root for the pinned runtime and its supporting assets. */
export const MATHJAX_BASE = `https://cdn.jsdelivr.net/npm/mathjax@${MATHJAX_VERSION}`;
/** TeX-to-CommonHTML entry script relative to the package root. */
export const MATHJAX_ENTRY_PATH = '/es5/tex-chtml-full.js';
/** Complete URL loaded lazily when a renderer needs math typesetting. */
export const MATHJAX_ENTRY_URL = `${MATHJAX_BASE}${MATHJAX_ENTRY_PATH}`;
/** CDN metadata endpoint for enumerating assets in this pinned package. */
export const MATHJAX_PACKAGE_API = `https://data.jsdelivr.com/v1/package/npm/mathjax@${MATHJAX_VERSION}`;
