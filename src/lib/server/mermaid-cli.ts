import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { renderMermaid } from '@mermaid-js/mermaid-cli';
import puppeteer from 'puppeteer';
import { PUPPETEER_EXECUTABLE_PATH } from '$app/env/private';
import { LruCache } from '#lib/server/lru-cache.js';

const svgCache = new LruCache<string, Promise<string>>(64);
const MERMAID_RENDER_CONFIG = {
  securityLevel: 'strict' as const,
  htmlLabels: false,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 14,
  markdownAutoWrap: true,
  flowchart: { wrappingWidth: 260 },
};
const TRANSIENT_BROWSER_ERROR = /(target|session|protocol|crash|closed)/i;
const LAUNCH_TIMEOUT_MS = 4_000;
const RENDER_TIMEOUT_MS = 8_000;

/** Race work against a deadline and release the timer on every exit path. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Mermaid operation timed out after ${ms}ms.`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer the declared binary, then a system install, then Puppeteer's browser. */
function browserExecutablePath(): string | undefined {
  if (PUPPETEER_EXECUTABLE_PATH) return PUPPETEER_EXECUTABLE_PATH;
  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].find(existsSync);
}

/**
 * Render one definition in an owned browser. Closing it also releases pages
 * left running after a render deadline. No browser survives the render call.
 */
async function renderOnce(definition: string): Promise<string> {
  const browser = await puppeteer.launch({
    executablePath: browserExecutablePath(),
    headless: true,
    timeout: LAUNCH_TIMEOUT_MS,
    protocolTimeout: RENDER_TIMEOUT_MS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  try {
    const result = await withTimeout(
      renderMermaid(browser, definition, 'svg', {
        backgroundColor: 'transparent',
        mermaidConfig: MERMAID_RENDER_CONFIG,
      }),
      RENDER_TIMEOUT_MS,
    );
    return Buffer.from(result.data).toString('utf8');
  } finally {
    try {
      await withTimeout(browser.close(), LAUNCH_TIMEOUT_MS);
    } catch {
      // A wedged browser must not outlive its owner after graceful close fails.
      browser.process()?.kill('SIGKILL');
    }
  }
}

/** Retry one transient browser failure with a fresh, independently owned browser. */
async function renderUncached(definition: string): Promise<string> {
  try {
    return await renderOnce(definition);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !TRANSIENT_BROWSER_ERROR.test(error.message)
    )
      throw error;
    return renderOnce(definition);
  }
}

/**
 * Render Mermaid to SVG with strict security and a bounded content cache.
 * Concurrent identical definitions share a promise; failures are evicted.
 * Each uncached attempt owns and closes its browser, including on timeout.
 */
export async function renderMermaidSvg(definition: string): Promise<string> {
  const hash = createHash('sha256')
    .update(definition)
    .update(JSON.stringify(MERMAID_RENDER_CONFIG))
    .digest('hex');
  const cached = svgCache.get(hash);
  if (cached) return cached;
  const pending = renderUncached(definition);
  svgCache.set(hash, pending);
  try {
    return await pending;
  } catch (error) {
    svgCache.delete(hash);
    throw error;
  }
}
