# Shared implementation and review conventions

Read this guide for implementation, refactoring, and code review. It preserves the shared ownership, generated-artifact, organization, and working rules; load the language or subsystem guide only for the boundary the task touches.

## Non-negotiables

- **Every exported declaration and public API member must be documented, without exceptions.** Use JSDoc for TypeScript declarations and public members and Svelte `@component` documentation and documented props for components. Document reexports at their source and include public fields, constructors, getters, methods, and exported test helpers. Documentation must describe the actual contract, including state ownership and teardown when applicable.
- **Project identifiers have distinct roles.** `Financial Calculators` is the display name, `financial-calculators` is the machine slug, and `awpala` is the repository owner. Keep display names out of machine identifiers and update related configuration together when a project setting changes.
- **Keep the local port aligned.** Vite, devcontainer forwarding, and the stop helper use `2252`. The production Dockerfile listens on `8080`. CI checks the actual project configuration.

- **Never run a `git` write command** (commit, push, branch, merge, rebase, reset, tag, stash) unless the human explicitly asks in that turn. Git history is human-owned.

## Forbidden patterns by agent/runtime role

The following are hard constraints for review and implementation across code changes. They mirror the ownership contract and must be documented in runtime-change ADRs and enforced at code-review time. See [docs/adrs/objects-lifetime-management.md](../adrs/objects-lifetime-management.md).

- **UI agent**: register listeners/observers/timers at module scope for interactive behavior or route-local state.
  - Impact: duplicated interactions after navigation and process-wide state leakage under SSR.
- **UI route agent**: store route-specific state (current user interaction, search context, transient auth-derived values) in global/module-level mutable objects.
  - Impact: cross-route and cross-user contamination in a long-lived node process.
- **Server/build owner**: cache a session verdict or retain an unowned browser, timer, or pending task across unrelated renders.
  - Impact: stale access decisions, leaked processes, or late work acting on a replacement owner.

When these patterns appear in a PR, the change must be blocked until ownership boundaries and teardown paths are explicit.

## Module organization

Keep one class per file, together with the helpers and types describing that class's contract. A private error type beside its class belongs there. Pure functions need no class, and a small helper needs no separate file merely to satisfy a size target. Related records may stay together when they describe one cohesive contract.

Subfolders name a responsibility: `persistence/`, `presentation/`, `navigation/`, `parsers/`, or `timing/`. Do not introduce `utils/`, `common/`, `shared/`, or `misc/`. A domain root keeps contracts and its composition point; distinct implementations belong under their responsibility.

Extract shared logic only when callers share the same rule. State and cleanup remain with the owning instance. Prefer cohesion over line count: keep a long controller intact when it has one responsibility and lifecycle. Keep access checks at the request boundary and outside generic presentation components.

When moving code, update every importer and remove the old path. Do not add forwarding files or barrel exports at retired paths. These conventions apply alongside the language conventions in the specialty guides. See [the organization decision](../adrs/module-organization.md) and [the organization skill](../../.agents/skills/module-organization/SKILL.md).

## Working in This Repo

- **Edit, don't recreate.** Prefer modifying existing files over scaffolding new ones. Before adding a helper, search for one that already exists.
- **Match the file's style.** Two-space indentation and single quotes in TS/JS/Svelte, enforced by [.prettierrc](../../.prettierrc). Never argue with a formatter.
- **Comments preserve contracts and reasoning.** Prefer clear names to comments that merely repeat application statements. Public API documentation remains mandatory, and provisioning/configuration files require comprehensive inline explanations of behavior, ordering, dependencies, failure modes, and operational lessons. Concision is not a reason to delete useful exposition.
- **Do NOT leave vestigial comments on code removal.** If a removal has been asserted, do not replace it with a lingering comment; a reduction should be net-lines-of-code reductive in the source files. Logic is trued up with updated tests and git history, not with commentary about what used to be there.
- **Don't add backwards-compat shims** for code in this repo — a project seeded from this template is pre-1.0 and freely refactorable.
- When you complete a UI change, exercise it in the dev server before reporting done.
- **Use American English exclusively** in all code, comments, docs, and commit messages. Initialize, not initialise; color, not colour; behavior, not behaviour.
- Markdown in this repository does **not** hard-wrap semantic paragraphs. One paragraph is one line, one bullet is one line, with a blank line between paragraphs. Fenced code blocks and Mermaid bodies are the exception, where line structure is significant.
- Relative markdown links only, so they are clickable from a rendered view and verifiable from a checkout. A link to a path that does not exist is a defect.

## Commands

Run available checks within the user's stated environment limits and report missing or deferred gates explicitly. Development and artifact checks do not establish production-image behavior; CI also builds and exercises the Nginx container. Remote rollout verification belongs to the deployment procedure.

The command definitions in the [application guide](app.md#commands) match package.json. The aliases installed by [.devcontainer/scripts/setup-env.sh](../../.devcontainer/scripts/setup-env.sh) call those commands through the live harness. [Development operations](operations.md) preserves combined checks and provisioning conventions.
