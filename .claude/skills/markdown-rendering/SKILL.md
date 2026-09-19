---
name: markdown-rendering
description: Change the markdown dialect, AST, parser, renderers, or server highlighting and Mermaid transforms while preserving content and lifecycle boundaries.
---

Read the [markdown subsystem conventions](../../../docs/agents/markdown.md) for this specialty. Use the [root task directory](../../../AGENTS.md) to select additional guidance only when the assignment crosses that boundary; do not preload all agent guides or skill references.

# Markdown subsystem changes

Read [the markdown library contract](../../../src/lib/markdown/README.md), the affected parser and renderer, and representative tests. Load [Svelte conventions](../svelte-core-bestpractices/SKILL.md) when changing components or reactive modules.

The parser produces one request-owned AST. Highlighting and Mermaid transforms mutate that tree and return `Promise<void>`. Update tree walkers when adding nodes with nested blocks or inline content; omitting a walker branch silently drops enhancements inside that node.

Keep pure syntax parsing separate from browser interaction and server integrations. Node, Shiki, and Chromium stay in `lib/server`; renderer context and popup state stay per component tree. Every listener, observer, timer, and browser process needs cleanup. The default rendering dialect includes structural HTML tables, templates, math, and footnotes, but no reader-specific progress or reading-time state.

Preserve HTML-table sanitation and safe-link checks at the input boundary. Raw HTML, highlighted markup, and SVG fields supplied directly in an external AST are not trusted merely because they satisfy a TypeScript type. Test adversarial markup and URL cases when changing those paths, while preserving supported spans and alignment.

Use the first-party Svelte MCP for relevant API changes and installed diagnostics when its documentation major differs from the pin. Run the UI gate and targeted parser tests; inspect browser rendering for layout and interaction changes. Mermaid rendering checks are separate from the fast documentation gate because they launch Chromium.
