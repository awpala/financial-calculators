# Markdown subsystem engineering conventions

Read this guide when changing the markdown dialect, AST, parser, renderers, or server transforms. Ordinary edits to a Markdown document use the [documentation guide](documentation.md). For implementation, also use the [shared workflow](workflow.md); load [UI conventions](app.md) for component, reactive-module, or SvelteKit changes and [tooling policy](tooling.md) when changing ecosystem APIs.

## The markdown subsystem

- [src/lib/markdown/](../../src/lib/markdown) is a hand-written parser and renderer, not a wrapper around a third-party markdown library. It follows one rule: **parse → transform AST → render.** Custom constructs are parser productions and AST transforms, never regex rewriting of rendered HTML.
- The AST in [src/lib/markdown/types.ts](../../src/lib/markdown/types.ts) is the contract between the two halves. The parser produces structured nodes; the `htmlTable` node contains allowlist-sanitized markup. Renderers consume node content rather than reparsing the original document. Server transforms may attach generated highlighted HTML or SVG; never populate those trusted fields directly from untrusted external AST values.
- The example route parses and transforms during prerendering and development; the parser itself is pure. Everything in the AST must stay **serializable** — it crosses the SSR boundary as data, so no functions, class instances, or DOM references.
- Reference: [src/lib/markdown/README.md](../../src/lib/markdown/README.md), which is authoritative for this subsystem, and the [`markdown-rendering`](../../.agents/skills/markdown-rendering/SKILL.md) skill.
