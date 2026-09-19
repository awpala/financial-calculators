import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

// Deployment smoke checks cover the entry page, assets, health, and HTTP
// behavior. Feature rendering and example content belong to application tests.
// Without a URL, inspect an existing local build. The container harness instead
// supplies a loopback URL and checks only HTTP, with no host build required.
const origin = process.env.DEPLOYMENT_BASE_URL;

/** Find a generated stylesheet in the HTML produced by the build under test. */
function stylesheetPath(html) {
  const asset = html.match(/(?:\.?\/)*(_app\/immutable\/[^"'\s]+\.css)/)?.[1];
  assert.ok(asset, 'Expected a hashed stylesheet in the rendered home page.');
  return `/${asset}`;
}

/** Request the disposable container without hiding redirects under test. */
function request(path) {
  return fetch(new URL(path, origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(3000),
  });
}

describe('static build sanity', { skip: Boolean(origin) }, () => {
  it('contains a prerendered entry page and its stylesheet', async () => {
    const html = await readFile('build/index.html', 'utf8');
    assert.match(html, /<main\b/);
    const asset = stylesheetPath(html);
    assert.ok((await readFile(`build${asset}`)).length > 0, asset);
  });

  it('contains the health marker and application error page', async () => {
    assert.equal((await readFile('build/healthz', 'utf8')).trim(), 'ok');
    assert.match(await readFile('build/404.html', 'utf8'), /<main\b/);
  });
});

describe('production Nginx HTTP behavior', { skip: !origin }, () => {
  before(async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        if ((await request('/healthz')).ok) return;
      } catch {
        // The container may still be starting; all requests have a deadline.
      }
      await delay(200);
    }
    assert.fail('Nginx did not become ready.');
  });

  it('serves the entry page anonymously, with revalidation', async () => {
    const response = await request('/');
    assert.equal(response.status, 200, '/');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.match(response.headers.get('cache-control'), /no-cache/);
    assert.match(await response.text(), /<main\b/);
  });

  it('serves the public health endpoint', async () => {
    const health = await request('/healthz');
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');
  });

  it('caches hashed assets and returns 404 for missing pages and assets', async () => {
    // The image builds independently of the host artifact. Discover its asset
    // URLs from its own HTML; content hashes need not match the host build.
    const home = await request('/');
    assert.equal(home.status, 200, '/');
    const asset = stylesheetPath(await home.text());
    const response = await request(asset);
    assert.equal(response.status, 200, asset);
    assert.match(
      response.headers.get('cache-control'),
      /max-age=31536000, immutable/,
    );
    for (const path of ['/missing-page/', '/_app/immutable/missing.js']) {
      const missing = await request(path);
      assert.equal(missing.status, 404, path);
      assert.match(await missing.text(), /<main\b/, path);
    }
  });
});
