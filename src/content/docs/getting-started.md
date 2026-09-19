# Getting started

Financial Calculators combines a responsive application shell with reusable controls, charts, and a rich markdown renderer. Calculator features will build on this foundation.

## Application foundation

The examples demonstrate the existing library for future calculator work. Components own presentation, routes own their data, and context scopes interactive state to its component tree.

> [!TIP]
> The theme toggle remembers your choice across visits. Each document also lends its table of contents to the shell's contextual rail.

## Local documents

Markdown files under `src/content/docs/` become pages. A nested file such as `guides/deployment.md` becomes `/docs/guides/deployment/`.

```typescript
const doc = parse(source);
await renderMermaidDiagrams(doc);
await highlightCodeBlocks(doc);
```

The renderer receives the prepared document. It does not need the original source or a second parser in the browser.

## Data flow

```mermaid
flowchart LR
  Source[Local markdown] --> Parse[Typed AST]
  Parse --> Transform[Highlighting and diagrams]
  Transform --> Page[Rendered page]
  Page --> Browser[Interactive enhancements]
```

## Shared conventions

| Boundary | Responsibility |
| :--- | :--- |
| Elements | Controls, fields, surfaces, and feedback |
| Behaviors | Interaction and cleanup |
| Layout | Page and rail geometry |
| Views | Application composition |
| State | Preferences and owned lifetimes |

See the [deployment guide](../guides/deployment/) for the public static hosting model.
