# Versioned authority and first-party tooling

Determine exact language, runtime, framework, and dependency versions from manifests, lockfiles, toolchain files, and build configuration before selecting APIs. Public prose names major versions; executable configuration owns exact pins.

## Authoritative implementation policy

1. Query the configured first-party Svelte MCP before introducing or materially changing Svelte/Kit APIs. Analyze changed components with its autofixer and inspect suggestions before applying them.
2. Prefer exact-version official documentation, then installed compiler/analyzer diagnostics, repository contracts, and official examples. A registry tag or community example cannot override those authorities.
3. The documentation service can return a different Kit major. Compare it with the installed declarations and report that mismatch; do not introduce older configuration or environment APIs merely because an example uses them.
4. Treat documentation tools as read-only. Operational capabilities do not authorize unrelated mutations of remote systems or Git history. Respect the user's existing authorization without adding redundant approval steps.
5. Run formatting, lint, types, tests, and the production build and image. Do not claim completion while required gates fail.
6. Report the detected versions, first-party documentation/analyzer consulted, executed checks, and unresolved warnings or limitations. If a tool is unavailable, report it and prefer the installed diagnostics rather than inventing its result.

## MCP servers

[.mcp.json](../../.mcp.json) and [.codex/config.toml](../../.codex/config.toml) declare the same first-party `svelte` stdio server at `/workspace/node_modules/.bin/svelte-mcp`. It is a pinned local development dependency, avoiding an unversioned `npx` fetch or shared-cache failure. Its documentation requests still need network access. A host session outside the devcontainer may need to change the absolute command path.

For Coolify, Docker, GitHub Actions, and other tooling, use the vendor's official documentation and installed declarations/configuration. Never present a community server as first-party. The deterministic gates remain the enforcement authority, independently of MCP advice.
