import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

/**
 * Environment variables this application reads.
 *
 * Declaring them here is what makes them importable: SvelteKit 3 exposes only
 * declared variables through `$app/env/private` and `$app/env/public`, so an
 * undeclared variable is a compile error rather than a silent `undefined` at
 * runtime. The legacy `$env/static/*` and `$env/dynamic/*` modules are not used.
 *
 * Schemas are valibot. Kit does not declare valibot as a peer dependency, so it
 * is an explicit devDependency of this package -- without it, any schema beyond
 * a bare passthrough function fails to resolve.
 */
export const variables = defineEnvVars({
  /** Chromium binary for build-time diagrams; empty uses Puppeteer's managed browser. */
  PUPPETEER_EXECUTABLE_PATH: {
    schema: v.optional(v.pipe(v.string(), v.trim()), ''),
  },
});
