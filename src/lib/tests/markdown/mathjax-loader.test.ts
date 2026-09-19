import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestRuntime = {
  typesetPromise?: (elements: Element[]) => Promise<void>;
  typesetClear?: (elements: Element[]) => void;
  startup?: { promise?: Promise<unknown> };
};
const mathWindow = window as Window & { MathJax?: TestRuntime };
let loader: typeof import('#lib/markdown/renderers/state/mathjax-loader.js');

function script(): HTMLScriptElement {
  const element = document.getElementById('mathjax-script');
  if (!(element instanceof HTMLScriptElement))
    throw new Error('Expected MathJax script');
  return element;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  delete mathWindow.MathJax;
  document.getElementById('mathjax-script')?.remove();
  document.body.replaceChildren();
  loader = await import('#lib/markdown/renderers/state/mathjax-loader.js');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete mathWindow.MathJax;
  document.getElementById('mathjax-script')?.remove();
  document.body.replaceChildren();
});

describe('MathJax page runtime', () => {
  it('shares one script attempt and waits for startup after the load event', async () => {
    const startup = deferred();
    const first = loader.ensureMathJaxLoaded();
    const second = loader.ensureMathJaxLoaded();
    expect(mathWindow.MathJax).toMatchObject({
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
      startup: { typeset: false },
    });
    expect(first).toBe(second);
    expect(document.querySelectorAll('#mathjax-script')).toHaveLength(1);
    mathWindow.MathJax = {
      typesetPromise: vi.fn(),
      startup: { promise: startup.promise },
    };
    script().dispatchEvent(new Event('load'));
    let ready = false;
    void first.then(() => (ready = true));
    await Promise.resolve();
    expect(ready).toBe(false);
    startup.resolve();
    await first;
    expect(ready).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes a failed script and lets a later caller retry', async () => {
    const first = loader.ensureMathJaxLoaded();
    const failure = expect(first).rejects.toThrow('Failed to load MathJax');
    const failedScript = script();
    script().dispatchEvent(new Event('error'));
    await failure;
    expect(failedScript.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    const retry = loader.ensureMathJaxLoaded();
    const retriedScript = script();
    expect(retriedScript).not.toBe(failedScript);
    mathWindow.MathJax = { typesetPromise: vi.fn() };
    retriedScript.dispatchEvent(new Event('load'));
    await retry;
    // The failed attempt must no longer react to events or erase ready state.
    failedScript.dispatchEvent(new Event('error'));
    expect(mathWindow.MathJax?.typesetPromise).toBeDefined();
  });

  it('reuses an already-ready runtime without injecting another script', async () => {
    mathWindow.MathJax = { typesetPromise: vi.fn() };
    await loader.ensureMathJaxLoaded();
    expect(document.getElementById('mathjax-script')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a hung script or startup and releases listeners and deadline', async () => {
    const pending = loader.ensureMathJaxLoaded();
    const failure = expect(pending).rejects.toThrow('timed out');
    const element = script();
    const remove = vi.spyOn(element, 'removeEventListener');
    mathWindow.MathJax = { startup: { promise: new Promise(() => {}) } };
    element.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(30_000);
    await failure;
    expect(element.isConnected).toBe(false);
    expect(remove.mock.calls.map(([event]) => event)).toEqual([
      'load',
      'error',
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up when script append fails', async () => {
    vi.spyOn(document.head, 'append').mockImplementation(() => {
      throw new Error('append blocked');
    });
    await expect(loader.ensureMathJaxLoaded()).rejects.toThrow(
      'append blocked',
    );
    expect(document.getElementById('mathjax-script')).toBeNull();
    expect(mathWindow.MathJax).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a loaded script without a usable typesetting API', async () => {
    const pending = loader.ensureMathJaxLoaded();
    const failure = expect(pending).rejects.toThrow(
      'without a typesetting API',
    );
    script().dispatchEvent(new Event('load'));
    await failure;
    expect(document.getElementById('mathjax-script')).toBeNull();
  });

  it('releases a rejected startup attempt rather than caching its rejection', async () => {
    const pending = loader.ensureMathJaxLoaded();
    const failure = expect(pending).rejects.toThrow('startup failed');
    mathWindow.MathJax = {
      startup: { promise: Promise.reject(new Error('startup broke')) },
    };
    script().dispatchEvent(new Event('load'));
    await failure;
    expect(mathWindow.MathJax).toBeUndefined();
    mathWindow.MathJax = { typesetPromise: vi.fn() };
    await loader.ensureMathJaxLoaded();
  });

  it('serializes separate owners and keeps the queue usable after typesetting failure', async () => {
    const held = deferred();
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    const typeset = vi
      .fn<(elements: Element[]) => Promise<void>>()
      .mockReturnValueOnce(held.promise)
      .mockRejectedValueOnce(new Error('bad formula'))
      .mockResolvedValue(undefined);
    mathWindow.MathJax = { typesetPromise: typeset };
    const a = loader.typesetMathElement(first);
    const b = loader.typesetMathElement(second);
    const failure = expect(b).rejects.toThrow('bad formula');
    await vi.advanceTimersByTimeAsync(0);
    expect(typeset).toHaveBeenCalledTimes(1);
    expect(typeset).toHaveBeenNthCalledWith(1, [first]);
    held.resolve();
    await a;
    await failure;
    await loader.typesetMathElement(first);
    expect(typeset).toHaveBeenNthCalledWith(2, [second]);
    expect(typeset).toHaveBeenCalledTimes(3);
  });

  it('invalidates outgoing targets and clears tracking after in-flight work finishes', async () => {
    const held = deferred();
    const element = document.createElement('div');
    document.body.append(element);
    const clear = vi.fn();
    const typeset = vi.fn().mockReturnValue(held.promise);
    mathWindow.MathJax = { typesetPromise: typeset, typesetClear: clear };
    const pending = loader.typesetMathElement(element);
    await vi.advanceTimersByTimeAsync(0);
    expect(typeset).toHaveBeenCalledOnce();
    loader.clearMathElement(element);
    held.resolve();
    await pending;
    expect(clear).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenLastCalledWith([element]);

    const queued = loader.typesetMathElement(element);
    loader.clearMathElement(element);
    await queued;
    expect(typeset).toHaveBeenCalledOnce();
    element.remove();
    await loader.typesetMathElement(element);
    expect(typeset).toHaveBeenCalledOnce();
  });
});
