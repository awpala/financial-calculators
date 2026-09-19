import {
  clearMathElement,
  ensureMathJaxLoaded,
  typesetMathElement,
} from './mathjax-loader.js';

/**
 * Provide renderer-owned math normalization and explicit element enhancement.
 * Loading and serialization belong to one browser-page runtime; owners clear
 * their outgoing element through clearElement on effect/attachment teardown.
 */
export function useMarkdownMath() {
  /** Normalize LaTeX fragments for MathJax rendering quirks used in docs source. */
  function normalizeLatexValue(value: string): string {
    return value
      .split('\n')
      .map((line) => {
        let out = line;
        const leading = out.match(/^(?:\\ )+/);
        if (leading) {
          const tokenCount = leading[0].length / 2;
          out = `${'\\space{}'.repeat(tokenCount)}${out.slice(leading[0].length)}`;
        }
        return out.replace(/\\ /g, ' ').replace(/, /g, ',\\space{}');
      })
      .join('\n');
  }

  return {
    normalizeLatexValue,
    ensureMathJaxLoaded,
    /** Typeset this connected element through the shared browser runtime. */
    typesetElement: typesetMathElement,
    /** Release MathJax's tracked nodes when this owner's content leaves. */
    clearElement: clearMathElement,
  };
}
