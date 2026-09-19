import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

// Artifact checks run after npm run build. The container harness also supplies
// a loopback URL to exercise the actual Nginx image without any remote resource.
const origin = process.env.DEPLOYMENT_BASE_URL;
const documentFiles = (
  await readdir('src/content/docs', { recursive: true })
).filter((name) => name.endsWith('.md'));
const pages = [
  '/',
  '/examples/',
  '/docs/',
  ...documentFiles.map((name) => `/docs/${name.slice(0, -3)}/`),
];

/** Read a directory-index page from the public build. */
function pageHtml(path) {
  return readFile(`build${path}index.html`, 'utf8');
}

/** Request the disposable container without hiding redirects under test. */
function request(path) {
  return fetch(new URL(path, origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(3000),
  });
}

describe('public static artifacts', () => {
  it('prerenders every page with visible content', async () => {
    for (const path of pages) {
      const html = await pageHtml(path);
      assert.match(html, /<h1\b/, path);
    }
    for (const file of documentFiles) {
      const source = await readFile(`src/content/docs/${file}`, 'utf8');
      const title = source.match(/^# (.+)$/m)?.[1];
      assert.ok(title, `Document requires a title: ${file}`);
      assert.ok(
        (await pageHtml(`/docs/${file.slice(0, -3)}/`)).includes(title),
      );
    }
  });

  it('includes build-time diagrams, route data, health, and a real error page', async () => {
    const html = await pageHtml('/docs/getting-started/');
    assert.match(html, /<svg[^>]+id="my-svg"/);
    assert.match(html, /shiki/);
    const data = JSON.parse(
      await readFile('build/docs/getting-started/__data.json', 'utf8'),
    );
    assert.equal(data.type, 'data');
    assert.equal((await readFile('build/healthz', 'utf8')).trim(), 'ok');
    assert.match(await readFile('build/404.html', 'utf8'), /Page not found/);
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

  it('serves pages and route data anonymously, with revalidation', async () => {
    for (const path of [...pages, '/docs/getting-started/__data.json']) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('set-cookie'), null);
      assert.match(response.headers.get('cache-control'), /no-cache/);
      if (path.endsWith('.json'))
        assert.equal((await response.json()).type, 'data');
      else assert.match(await response.text(), /<h1\b/, path);
    }
  });

  it('keeps health public and directory redirects independent of the proxy', async () => {
    const health = await request('/healthz');
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');
    const redirect = await request('/docs/guides/deployment');
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/docs/guides/deployment/');
  });

  it('caches hashed assets and returns 404 for missing pages and assets', async () => {
    const html = await pageHtml('/');
    const asset = html.match(/(?:\.?\/)*(_app\/immutable\/[^"'\s]+\.css)/)?.[1];
    assert.ok(asset, 'Expected a hashed stylesheet in the rendered home page.');
    const response = await request(`/${asset}`);
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('cache-control'),
      /max-age=31536000, immutable/,
    );
    for (const path of [
      '/missing-page/',
      '/login/',
      '/logout/',
      '/_app/immutable/missing.js',
    ]) {
      const missing = await request(path);
      assert.equal(missing.status, 404, path);
      assert.match(await missing.text(), /Page not found/);
    }
  });
});
