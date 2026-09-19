# AGENTS.md

Guidance for AI coding agents working in this repository. Compatible with the [agents.md](https://agents.md/) convention. `CLAUDE.md` is a relative symlink to this canonical entry point; edit `AGENTS.md`, never replace the link with a second instruction document.

**Financial Calculators** is a public static application for ad hoc financial calculations and visualizations. Its reusable UI, document libraries, and example routes form the development baseline for calculator features. Preserve library contracts and limit domain changes to the assigned task. Current scope and service boundaries live in [project scope](docs/agents/project.md).

## Load guidance for the current task

Start here, then read only the guides whose scope matches the assignment. These are the detailed repository instructions, not optional summaries. Do not load every document under `docs/agents/`, every skill, or every ADR at startup. For a task crossing boundaries, load each affected specialty; follow further references when their subject is involved. Reuse guidance already read in the current context instead of reloading it through each referring skill. Read the affected application or library README for its standalone contract.

| Task or responsibility                              | Detailed guidance                                         | When to load it                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Change the project domain or scope              | [Project scope](docs/agents/project.md)               | Project configuration, domain work, and service boundaries                           |
| Implement, refactor, or review code                 | [Shared workflow](docs/agents/workflow.md)                | Ownership, non-negotiables, forbidden runtime patterns, module organization, and working conventions |
| Select ecosystem APIs or change tooling             | [Versioned authority and tools](docs/agents/tooling.md)   | Exact pins, first-party MCPs, controlled sources, source precedence, and completion evidence         |
| Write or review documentation and comments          | [Documentation contracts](docs/agents/documentation.md)   | Public API exposition, README/ADR/runbook depth, provisioning comments, and version claims           |
| Application: Svelte, TypeScript, or styling           | [Application engineering](docs/agents/app.md)                       | Frontend conventions, SSR boundaries, component lifetimes, and app commands                           |
| Markdown parser, AST, renderer, or transforms       | [Markdown engineering](docs/agents/markdown.md)           | Syntax and rendering boundaries; ordinary Markdown prose edits use the documentation guide           |
| Provisioning, developer helpers, CI, or operations  | [Development operations](docs/agents/operations.md)       | Combined gates, container commands, script conventions, and deployment entry points                  |
| Agent definitions, skills, or harness configuration | [Harness routing and maintenance](docs/agents/harness.md) | Skill/agent selection, mirrored workflows, tool-specific settings, and instruction ownership         |

Each specialty links its applicable skills. Load those when their stated trigger applies; the [complete skill and agent directory](docs/agents/harness.md#skills-and-agents) is available when selecting or maintaining a role. Skill references are conditional detail, not a request to preload their entire reference tree.

## Rules that apply to every task

- Respect the user's scope, existing authorization, and environment limits. Complete authorized local work; a configured tool or example command does not authorize unrelated database, infrastructure, or external mutations.
- **Never run a Git write command unless the human explicitly asks in that turn.** Git history is human-owned.
- **Preserve documentation depth.** Moving guidance must retain its rules, rationale, examples, commands, useful tables, and diagrams. Keep explanations aligned with the application while preserving their reasoning. Every exported declaration and public API member must be documented, including ownership and teardown where applicable.
- **Keep layer ownership explicit.** Routes own composition, server modules own build-time document preparation, and reusable presentation stays independent of the example domain. Route/request state belongs to its owner, and external resources need explicit teardown.
- **Keep project configuration consistent.** `Financial Calculators`, `financial-calculators`, `awpala`, and local port `2252` are established values. Production uses internal port `8080` and the public origin `https://fincalcs.portfolio-projects.dev`. Do not change project values merely to force host checks to run.
- **Validate within the authorized environment and report the evidence accurately.** Run the affected gates when available; do not claim deferred checks passed. Report checks unavailable in the current environment separately from passing gates.
- Use American English and repository-relative Markdown links. Keep semantic paragraphs on one line; preserve meaningful code and Mermaid line structure.

## Maintaining this directory

Add detailed guidance to the document that owns the responsibility and link it here when a new specialty warrants its own guide. Keep this entry point small by moving content, not deleting it. Update incoming links and conditional skill/agent references when moving a section. Keep service and library READMEs standalone, and preserve the [harness mirrors and role equivalence](docs/agents/harness.md) when changing their instructions.
