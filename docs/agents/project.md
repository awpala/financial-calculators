# Project scope and boundaries

Financial Calculators is an independent application for ad hoc financial calculations and visualizations. Phase 0 establishes the development environment, reusable UI and document libraries, public static architecture, and Coolify deployment pipeline. Calculator behavior and the first production deployment are subsequent work.

## Project configuration

| Setting | Value |
| --- | --- |
| Display name | Financial Calculators |
| Package and repository | `financial-calculators` |
| GitHub owner | `awpala` |
| Local dev/preview port | `2252` |
| Production internal port | `8080` |
| Public origin | `https://fincalcs.portfolio-projects.dev` |

One root npm package uses SvelteKit 3 prerelease, Svelte 5 runes, TypeScript 6 strict, Tailwind CSS 4, Node 24, and Vitest. Development uses a single running devcontainer. Its setup script owns provisioning, idempotent profile entries, and live helper commands. `run-app` starts the app on the configured local port.

## Current application scope

The landing page introduces the application foundation. `/examples/` composes fields, filtering, dialogs, and charts without external I/O. `/docs/` renders repository-owned markdown with syntax highlighting, Mermaid, heading navigation, tables, math, and popups. Retain these examples and the reusable libraries while calculator requirements develop; make domain-specific changes within the assigned task rather than pruning `src/` broadly.

All pages are prerendered and ship public HTML, route data, and client assets. Content is bundled at build time and changes require rebuilding. Coolify builds the root Dockerfile and serves the result through Nginx; the private GitHub repository is a source-access boundary, not a visitor-access requirement. There is no application authentication, account database, runtime API, or session store.

## Development and operations

Routes own composition and local interactions. Server-only modules prepare documents during builds and development. Reusable presentation remains independent of calculator policy. Preserve the [application](app.md), [markdown](markdown.md), [workflow](workflow.md), [documentation](documentation.md), [tooling](tooling.md), and [operations](operations.md) contracts and the standalone library READMEs.

Use the [Coolify runbook](../runbooks/prod-deployment.md) for future production setup. Editing deployment files does not execute that procedure or establish remote DNS, TLS, secrets, or resource state.
