import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const HOST_ALL_WILDCARD = '0.0.0.0';
const PORT_APP = Number('2252');

/** Configure static SvelteKit output, Tailwind, and the isolated Vitest environment. */
export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for project code, but not for libraries, which may
        // still be authored in legacy mode. Removable in Svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      adapter: adapterStatic({ strict: true }),
    }),
  ],
  // Vitest needs Svelte's `browser` entry points even though it runs in Node.
  // This must stay scoped to test runs: applying it unconditionally also points
  // the dev SSR pipeline at the client build, and `setContext` then throws
  // `lifecycle_outside_component` mid-render -- a cold `npm run dev` 500s on the
  // first page render after a non-rendering request. The production build masks
  // it, so it only ever shows up in dev.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  server: {
    host: HOST_ALL_WILDCARD,
    port: PORT_APP,
    // The workspace is a bind mount from the host; inotify events do not cross
    // that boundary reliably, so the watcher polls instead of missing changes.
    watch: {
      usePolling: true,
      interval: 1000,
      // SvelteKit writes these generated startup files while the dev server
      // starts. Polling can otherwise discover that write during the first SSR
      // request and invalidate the active Svelte server context mid-render.
      ignored: [
        '**/.svelte-kit/generated/dev/server.js',
        '**/.svelte-kit/generated/dev/shared/error-template.js',
      ],
    },
  },
  preview: {
    host: HOST_ALL_WILDCARD,
    port: PORT_APP,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/tests/setup.ts'],
    include: ['src/lib/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Measure every shipped source file, not only the ones a test happened to
      // import: the default include would score an untested module as absent
      // rather than as uncovered.
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/lib/tests/**', 'src/**/*.d.ts'],
    },
  },
});
