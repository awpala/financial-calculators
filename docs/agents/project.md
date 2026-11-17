# Project scope and boundaries

Financial Calculators is an independent application for ad hoc financial calculations and visualizations. Its initial `main` baseline includes the development environment, reusable UI and document libraries, public static architecture, and Coolify deployment pipeline. Ongoing application work develops calculator features within these boundaries.

## Project configuration

| Setting | Value |
| --- | --- |
| Display name | Financial Calculators |
| Package and repository | `financial-calculators` |
| GitHub owner | `awpala` |
| Local dev/preview port | `2252` |
| Production internal port | `8080` |
| Public origin | `https://fincalcs.portfolio-projects.dev` |

One root npm package uses SvelteKit 3, Svelte 5 runes, TypeScript 6 strict, Tailwind CSS 4, Node 26, and Vitest. Development uses a single running devcontainer. Its setup script owns provisioning, idempotent profile entries, and live helper commands. `run-app` starts the app on the configured local port.

## Current application scope

Home is a minimal entry point. `/amortization/` provides loan assumptions, a principal/interest stacked chart, and payment schedules. `/scratchpad/` provides the lifted calculator language, highlighted editor, results, and named bindings. `/cashflow/` provides annual/hourly take-home estimates and an income/deductions balance sheet selectable by year or month. All three keep working in browser-local storage. Routes own editing, while the root-owned settings controller coordinates persisted Amortization/Cashflow working copies and independent Reset presets. `/settings/` and `/settings/cashflow/` provide per-view defaults and a confirmed global reset that preserves Scratchpad. Navigation is Home, Scratchpad, Amortization, then Cashflow. The starter Examples and Docs routes are removed; preserve the reusable UI, chart, markdown, and server libraries and their contracts.

All pages are prerendered and ship public HTML, route data, and client assets. Content is bundled at build time and changes require rebuilding. Coolify builds the root Dockerfile and serves the result through Nginx; the private GitHub repository is a source-access boundary, not a visitor-access requirement. There is no application authentication, account database, runtime API, or session store.

## Development and operations

Routes own composition and local interactions. Server-only modules prepare documents during builds and development. Reusable presentation remains independent of calculator policy. Preserve the [application](app.md), [markdown](markdown.md), [workflow](workflow.md), [documentation](documentation.md), [tooling](tooling.md), and [operations](operations.md) contracts and the standalone library READMEs.

Use the [Coolify runbook](../runbooks/prod-deployment.md) for production configuration, deployment, verification, and recovery. Editing deployment files does not execute that procedure or establish the deployed revision, remote DNS, TLS, or resource state.
