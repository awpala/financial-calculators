import { browser } from '$app/env';
import { MATHJAX_ENTRY_URL } from '#lib/mathjax.js';

interface MathJaxRuntime {
  typesetPromise?: (elements: Element[]) => Promise<void>;
  typesetClear?: (elements: Element[]) => void;
  startup?: { promise?: Promise<unknown>; typeset?: boolean };
  loader?: { load: string[] };
  options?: {
    safeOptions: {
      allow: { URLs: 'safe'; classes: 'safe'; cssIDs: 'safe'; styles: 'safe' };
      safeProtocols: Record<string, boolean>;
    };
  };
  tex?: {
    inlineMath?: [string, string][];
    displayMath?: [string, string][];
    processEscapes?: boolean;
  };
}

const SCRIPT_ID = 'mathjax-script';
const LOAD_TIMEOUT_MS = 30_000;

// Only browser entry points below mutate these cells. They own one page-global
// static runtime, never a document, identity, or other request-specific value.
let loading: Promise<void> | null = null;
let typesetting: Promise<void> = Promise.resolve();
const generations = new WeakMap<Element, number>();

function runtimeWindow(): Window & { MathJax?: MathJaxRuntime } {
  return window as Window & { MathJax?: MathJaxRuntime };
}

/**
 * Load one browser-page MathJax runtime and await its startup readiness.
 * Concurrent callers share the attempt; failure releases listeners/timer and
 * removes the reserved script so a later call can retry. Loading/startup has a
 * 30-second deadline. Server calls are no-ops and never mutate the shared cells.
 */
export function ensureMathJaxLoaded(): Promise<void> {
  if (!browser) return Promise.resolve();
  if (loading) return loading;

  const win = runtimeWindow();
  const attempt = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    let settled = false;
    let checkingReady = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script?.removeEventListener('load', onLoad);
      script?.removeEventListener('error', onError);
      if (error) {
        script?.remove();
        // A partially initialized/failed runtime cannot be reused as ready.
        delete win.MathJax;
        reject(error);
      } else {
        resolve();
      }
    };
    const checkReady = (loaded = false) => {
      if (settled || checkingReady) return;
      const math = win.MathJax;
      if (!math?.typesetPromise && !math?.startup?.promise) {
        if (loaded)
          finish(new Error('MathJax loaded without a typesetting API'));
        return;
      }
      checkingReady = true;
      void Promise.resolve(math.startup?.promise).then(
        () => {
          if (typeof win.MathJax?.typesetPromise === 'function') finish();
          else
            finish(
              new Error('MathJax startup did not provide a typesetting API'),
            );
        },
        () => finish(new Error('MathJax startup failed')),
      );
    };
    const onLoad = () => checkReady(true);
    const onError = () => finish(new Error('Failed to load MathJax'));
    const timer = setTimeout(
      () => finish(new Error('MathJax loading timed out')),
      LOAD_TIMEOUT_MS,
    );

    try {
      if (win.MathJax?.typesetPromise || win.MathJax?.startup?.promise) {
        checkReady();
        return;
      }
      if (!script) {
        win.MathJax = {
          // TeX can carry links and styles independently of markdown's HTML
          // sanitizer. Filter those attributes inside MathJax's own MathML tree.
          loader: { load: ['ui/safe'] },
          options: {
            safeOptions: {
              allow: {
                URLs: 'safe',
                classes: 'safe',
                cssIDs: 'safe',
                styles: 'safe',
              },
              safeProtocols: {
                http: true,
                https: true,
                file: false,
                javascript: false,
                data: false,
              },
            },
          },
          tex: {
            inlineMath: [['\\(', '\\)']],
            displayMath: [['\\[', '\\]']],
            processEscapes: true,
          },
          // Each renderer owns an explicit target; do not typeset the entire
          // document automatically while the runtime starts.
          startup: { typeset: false },
        };
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = MATHJAX_ENTRY_URL;
        script.async = true;
        script.addEventListener('load', onLoad);
        script.addEventListener('error', onError);
        document.head.append(script);
      } else {
        script.addEventListener('load', onLoad);
        script.addEventListener('error', onError);
      }
    } catch (error) {
      finish(
        error instanceof Error
          ? error
          : new Error('Failed to initialize MathJax'),
      );
    }
  });

  const shared = attempt.finally(() => {
    if (loading === shared) loading = null;
  });
  loading = shared;
  return shared;
}

/**
 * Typeset one connected owner element after readiness, serializing MathJax 3
 * operations across the page. Detached queued targets are skipped. Rejections
 * reach this caller while the queue remains usable by subsequent callers.
 * Clearing an element invalidates its queued work and clears tracking again
 * when any already-running operation finishes.
 */
export function typesetMathElement(element: Element | null): Promise<void> {
  if (!browser || !element) return Promise.resolve();
  const generation = generations.get(element) ?? 0;
  const isCurrent = () =>
    element.isConnected && (generations.get(element) ?? 0) === generation;
  const pending = typesetting.then(async () => {
    if (!isCurrent()) return;
    await ensureMathJaxLoaded();
    if (!isCurrent()) return;
    const math = runtimeWindow().MathJax;
    try {
      await math?.typesetPromise?.([element]);
    } finally {
      if (!isCurrent()) math?.typesetClear?.([element]);
    }
  });
  typesetting = pending.catch(() => undefined);
  return pending;
}

/** Forget MathJax's tracked nodes for an owner's outgoing subtree; server calls are no-ops. */
export function clearMathElement(element: Element | null): void {
  if (!browser || !element) return;
  generations.set(element, (generations.get(element) ?? 0) + 1);
  runtimeWindow().MathJax?.typesetClear?.([element]);
}
