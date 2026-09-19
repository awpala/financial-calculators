# Application engineering conventions

Read this guide for UI implementation and review: Svelte components, reactive modules, routes, TypeScript boundaries, and styling. Use the [shared workflow](workflow.md) for ownership and organization and [tooling policy](tooling.md) before changing ecosystem APIs. The [application guide](../app.md) and affected library README explain application behavior independently of the harness.

## Svelte 5

Keep route markup readable as a composition of named sections. Move cohesive feature-specific presentation to `src/lib/components/views/<feature>/`; place cross-cutting controls, surfaces, interactions, and geometry in their corresponding reusable component layer. Routes retain route-level state, persistence, and lifecycle registration. A feature component may own transient interaction state, such as chart hover or a confirmation dialog, without taking ownership of the calculation or persistence policy. Do not make reusable components import feature views or domain models to serve one caller, and do not split trivial fragments solely to meet a line-count target.

- **Runes mode is enforced** for all project code (see [vite.config.ts](../../vite.config.ts)). Use `$state`, `$derived`, `$effect`, `$props`, `$bindable` — do **not** use the Svelte 4 reactive `$:` label, `on:` event directives, `export let`, legacy store patterns as primary state, or `<slot>`.
- Component props: destructure via `let { foo, bar }: Props = $props();`, annotating the destructuring pattern with a **named local `type Props`** declared just above it. This is systematic — a component taking one prop, or one optional `class`, declares `type Props` exactly like a component taking ten. **Never an anonymous inline object type** (`let { foo }: { foo: string } = $props();`): a named type is what `ComponentProps<typeof Foo>` reads, what an editor names on hover, and what keeps the props contract one reviewable block instead of a shape spliced into a destructuring pattern; leaving it anonymous for "simple" props is precisely the drift that makes the convention unreliable. **Never `$props<T>()`** — `$props()` takes no type argument, so the type is dropped inside the component and every prop becomes `any` while the external signature still checks, which hides the loss. Type snippet props as `Snippet` from `svelte`, never as a bare function type.
- **Every `Props` declaration and every property in it carries a JSDoc doc comment**, including the obvious ones. The type's comment says what the component takes in one line ("Public inputs and callbacks for this component."); each property's says what the value means to the component, not what its type already states — required-vs-optional, the default when optional, who owns the value, and any obligation on the caller ("the owner must key this component by this identity"). These are the only documentation a call site sees on hover, so a property without one is an incomplete prop.
  ```svelte
  <script lang="ts">
    /** Public inputs for the loading announcement and indicator. */
    type Props = {
      /** Accessible status text; defaults to Loading. */
      label?: string;
      /** Classes for the animated SVG; defaults to size-8. */
      class?: string;
    };

    let { label = 'Loading', class: className = 'size-8' }: Props = $props();
  </script>
  ```
  A `Props` composed from other types rather than written as an object literal — `SharedAttributes & { ... }`, or an intersection of `ComponentProps<...>` for a component that only forwards to panels it wraps — still carries the type-level comment, and documents each property it adds itself; inherited properties are documented where they are declared.
- Promote prop shorthand in markup: when a prop/attribute name matches the variable, use `{foo}` instead of `foo={foo}`.
- Use `{@render children()}` for slot content (snippet API), not `<slot />`.
- Prefer `$derived` over `$effect` for computed values; reserve `$effect` for side effects (DOM, subscriptions, logging).
- Effects never run during SSR, so a `browser` guard inside an `$effect` body is dead code. Gate on `browser` in markup and in module-scope code, not in effects.
- Read browser environment values through `svelte/reactivity` (`MediaQuery`) and `svelte/reactivity/window` rather than wiring `addEventListener` by hand; they subscribe and release themselves and take an SSR fallback.
- Use `$state.raw` for cells that hold whole payloads and are only ever reassigned — deep reactivity proxies every nested object to buy tracking that spread-and-replace code never reads. [src/lib/state/storage.svelte.ts](../../src/lib/state/storage.svelte.ts) is the reference case, and it says so in its own doc comment.
- Generate DOM ids with `$props.id()`, never `Math.random()`: it is unique per component instance and stable across hydration. It must be the direct initializer of a variable declaration, so build composite ids from it in a second `const`.
- For a class that is conditionally _present_, use the clsx-style array form (`class={['base', flag && 'extra']}`). A plain ternary that picks between two class strings is fine as-is — an array adds nothing there.
- **Module-scope state is per-process, not per-request.** SSR is on during prerendering and development, so a `$state` cell — or any plain `let` — at module scope in a `.svelte.ts` module is a single object shared by every request that process serves, across clients and sessions. That is a cross-user data leak, not a style question: an identity, a session cookie, or a half-filled form left in a module cell is served to the next visitor.
  - Keep state-module getters pure. A getter that lazily seeds or repairs its own cell reads as harmless in the browser and is a cross-request leak on the server.
  - Update state immutably (spread and replace). Never mutate a value read out of a state module in place.
  - Gate module-scope bookkeeping and browser-global side effects (`window` listeners, refcounts) on `browser`, so a server render cannot mutate them on behalf of every later request. [src/lib/components/charts/tooltip-scroll-lock.ts](../../src/lib/components/charts/tooltip-scroll-lock.ts) is the worked example: module-scope counters, both entry points no-ops outside the browser.
  - `persisted()` makes the rule structural rather than advisory — on the server it hands back a deep-frozen initial value and **throws** on write, so a module-scoped cell that a server render tries to mutate fails loudly instead of leaking quietly.
- **Whatever a component acquires outside the component graph, it releases.** Timers, `window`/`document` listeners, observers, object URLs, and refcounted globals are returned as an `$effect` cleanup or an `onMount` teardown. A long-lived helper that owns a timer exposes `destroy()` and the owner calls it the same way — see `HoverController` in [src/lib/components/charts/hover-controller.svelte.ts](../../src/lib/components/charts/hover-controller.svelte.ts). On the server side, an `AbortSignal` deadline is cleared once the work it guards resolves; an un-cleared one keeps the event loop referenced and will abort a response body mid-stream.
- A route that registers something with the application shell owns the teardown it is handed back. `registerContextualRail` in [src/lib/context/shell.ts](../../src/lib/context/shell.ts) returns its own release function, and a route that does not call it on unmount leaves the next route wearing a rail it never registered.
- Legacy patterns are forbidden throughout this codebase.
- Reference: the `svelte` MCP server and the [`svelte-core-bestpractices`](../../.agents/skills/svelte-core-bestpractices/SKILL.md) skill.

## SvelteKit 3

- File-based routing under `src/routes/`. Use `+page.svelte`, `+layout.svelte`, `+page.ts`/`+page.server.ts`, `+layout.ts`/`+layout.server.ts` per the SvelteKit conventions.
- Use the `#lib` subpath imports declared in [package.json](../../package.json) for shared modules under `src/lib/`, with explicit module extensions.
- **Icons live at `src/lib/icons/`**, as their own top-level `lib` concern, grouped into visual-role subdirectories such as `actions/`, `navigation/`, and `keyboard/`. Import the concrete categorized file; document category responsibilities in [src/lib/icons/README.md](../../src/lib/icons/README.md), without listing every asset. Do not nest them under a components directory — an icon is a leaf asset every part of the app reaches for. Do not leave forwarding components at old paths after a move.
- The application uses `@sveltejs/adapter-static` for public pages. Recheck [vite.config.ts](../../vite.config.ts) before assuming a deployment target.
- **There is no `svelte.config.js`.** SvelteKit 3 config is passed to the `sveltekit()` plugin in [vite.config.ts](../../vite.config.ts). Do not create one. Upstream documentation that says "add this to `svelte.config.js`" means that call site here.
- **`resolve.conditions: ['browser']` must stay gated behind `process.env.VITEST`.** Vitest needs Svelte's browser entry points while running in Node, but applying the condition unconditionally points the dev SSR pipeline at the client build too, and `setContext` then throws `lifecycle_outside_component` mid-render — a cold `npm run dev` 500s on the first page render that follows a non-rendering request. The production build masks it, so this only ever shows up in dev.
- **Environment variables are declared, not imported ad hoc.** Declare them via `defineEnvVars` from `@sveltejs/kit/env` in [src/env.ts](../../src/env.ts) and import the named value from `$app/env/private` (or `$app/env/public`). An undeclared variable is a compile error rather than a silent `undefined` at runtime. Do not reach for the SvelteKit 2 `$env/static/*` or `$env/dynamic/*` modules. Build-environment flags (`browser`, `dev`, `building`) come from `$app/env`.
- **Internal links resolve through `resolve()`** from `$app/paths`. Fixed route targets use `RouteId`; query-bearing paths use `PathnameWithSearchOrHash` without a leading slash. A bare `href="/route"` on an `<a>` is a lint finding; typed targets also turn a renamed route into a type error.
- Server-only modules live under `src/lib/server/` and must never be imported by client code. Type-only imports are fine; SvelteKit erases them.

## TypeScript

- Strict mode is on ([tsconfig.json](../../tsconfig.json)). Avoid `any`; reach for `unknown` plus narrowing, or define a proper type.
- Keep `@types/node` on the same major as the configured Node runtime so type checking does not admit APIs unavailable in deployment.
- App-wide ambient types belong in `src/app.d.ts` (`App.Locals`, `App.PageData`).
- TypeScript stays on major 6 — see [Standing do-not-bump notes](documentation.md#standing-do-not-bump-notes).

## Tailwind CSS

- Tailwind 4, wired through the `@tailwindcss/vite` plugin in [vite.config.ts](../../vite.config.ts) — there is no `tailwind.config.js` and no PostCSS config to edit.
- Use utility classes directly on elements. Do not add a separate stylesheet for one-off styling that Tailwind already covers.
- Prefer Tailwind's design tokens (spacing, color) over hard-coded pixel/hex values.
- **For repeated class lists, extract a Svelte component rather than reaching for `@apply`** unless the abstraction is genuinely stylistic. The shared vocabulary lives in container components under [src/lib/components/](../../src/lib/components), not in a token layer — and where a class string genuinely has to be shared between components that cannot share an implementation, it is a named export in a plain `.ts` module (`surface.ts`, `field.ts`) consumed _by components only_, never by a route. See [docs/adrs/style-design-system.md](../adrs/style-design-system.md).

## Commands

### Application

Run from the repository root using `npm run <script>`.

- `npm run dev` — start the dev server on port `2252`. (Alias: `run-app`.)
- `npm run build` — production build.
- `npm run preview` — preview the production build.
- `npm run check` — `svelte-kit sync` then `svelte-check` against [tsconfig.json](../../tsconfig.json).
- `npm run lint` / `npm run lint:fix` — ESLint across the app project.
- `npm run format` / `npm run format:check` — Prettier over `src/`.
- `npm run test` — Vitest (`test:watch` and `test:coverage` for the other modes).

Public builds require complete prerendering; never disable strict adapter validation or add an SPA fallback to hide a dynamic route.

Gate: `npm run check`, `npm run lint`, `npm run format:check`, `npm run test`, and `npm run build` must all pass. Type-checking does not validate behavior — exercise a UI change in the dev server before reporting it done.

Use the [Svelte implementation workflow](../../.agents/skills/svelte-code-writer/SKILL.md) for MCP analysis and validation. The [standing dependency notes](documentation.md#standing-do-not-bump-notes) preserve the TypeScript, Kit/adapter prerelease, and Vitest/coverage compatibility constraints; consult them before changing UI dependencies.
