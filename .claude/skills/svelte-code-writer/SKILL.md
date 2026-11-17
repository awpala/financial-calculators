---
name: svelte-code-writer
description: Implement Svelte components and SvelteKit routes using the pinned first-party documentation and analyzer workflow.
---

Read the [UI conventions and commands](../../../docs/agents/app.md) for this specialty. Use the [root task directory](../../../AGENTS.md) to select additional guidance only when the assignment crosses that boundary; do not preload all agent guides or skill references.

# Svelte implementation workflow

Read [the shared Svelte conventions](../svelte-core-bestpractices/SKILL.md), [application README](../../../README.md), and relevant component contracts. Determine installed versions from the manifest and lockfile before selecting APIs.

Use the configured first-party `svelte` MCP to find the relevant documentation and analyze changed Svelte code with its autofixer. Inspect suggested changes before applying them. The documentation service may return an older Kit major than this repository: compare its API advice with the installed Kit declarations and compiler diagnostics, and state any mismatch instead of introducing Kit 2 APIs into Kit 3. If the server is unavailable, report that fact and rely on pinned diagnostics without inventing its result.

Preserve the local contracts that generic examples often miss: named documented `Props`, Svelte 5 runes, snippet callbacks, explicit `#lib` module extensions, typed route resolution, and declared `$app/env` imports. Kit configuration lives inside `sveltekit()` in `vite.config.ts`; do not create a Svelte config file. Keep Vitest's browser resolve condition gated by `VITEST`.

Own route state inside the component tree. Keep getters pure, replace whole `$state.raw` values, and return teardown for every external acquisition. Keep document preparation and its build dependencies behind server-only imports. Check a component's real props before changing its caller.

For changes affecting Scratchpad, perform the [required documentation check](../../../docs/agents/documentation.md#required-scratchpad-documentation-check) before reporting completion. Review `docs/scratchpad.md` and the calculator library guide, update affected behavior and examples in the same change, and report the review evidence even when no documentation edit is needed.

Run check, lint, format:check, test, and build from the repository root, then exercise changed behavior through the development server when the stack is available. User-specified environment limits take precedence: list deferred checks clearly rather than installing forbidden tooling or claiming they passed. Report the versions, first-party tools consulted, commands run, and remaining warnings.
