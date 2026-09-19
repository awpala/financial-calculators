# Agent harness configuration and routing

[AGENTS.md](../../AGENTS.md) is the canonical entry point. `CLAUDE.md` remains a relative symlink to it, so both tools enter through the same specialty directory. Load only guides relevant to the task, then conditional language references when needed.

## Shared skills and tool adapters

Canonical skills live in [.agents/skills/](../../.agents/skills), mirrored byte-for-byte into `.claude/skills/`. Edit the canonical copy, then copy it to the mirror. Preserve substantive rules, explanations, examples, diagrams, and lifecycle contracts when relocating instructions.

| Skill | Responsibility |
| --- | --- |
| [Svelte conventions](../../.agents/skills/svelte-core-bestpractices/SKILL.md) | Components, runes, snippets, reactivity, and lifecycle |
| [Svelte implementation](../../.agents/skills/svelte-code-writer/SKILL.md) | First-party documentation, analyzer, and validation workflow |
| [Markdown](../../.agents/skills/markdown-rendering/SKILL.md) | Parser, AST, transforms, rendering, and safe input boundaries |
| [Module organization](../../.agents/skills/module-organization/SKILL.md) | Responsibility, ownership, direct imports, and coherent boundaries |
| [Review](../../.agents/skills/repo-review/SKILL.md) | Concrete defects, contract preservation, and validation gaps |

The paired `svelte-file-editor` and `code-reviewer` roles in [.claude/agents/](../../.claude/agents/) and [.codex/agents/](../../.codex/agents/) must remain behaviorally equivalent. Their role files select guides instead of duplicating the whole instruction corpus. These definitions describe available roles; use delegation only when the active task and execution environment permit it.

Both tool configurations expose the project-local first-party Svelte MCP. [Tooling policy](tooling.md) owns source precedence and version mismatch handling. Permissions in `.claude/settings.json` and `.codex/rules/default.rules` cover the retained application commands. Broad command permissions do not authorize unrelated external writes. Git history remains human-owned.

## Standing rules

- Use Svelte 5 runes and documented named Props; no legacy slots, directives, or reactive labels.
- Preserve context ownership and release listeners, observers, timers, requests, browsers, and shell registrations.
- Keep pages fully prerendered and public, and keep build-time document dependencies behind server-only imports.
- Preserve TypeScript/Kit/adapter compatibility and matching Vitest/coverage versions as described in [documentation policy](documentation.md#standing-do-not-bump-notes).
- Never run Git write commands unless the user explicitly requests them.

## Maintaining the harness

When moving guidance, update incoming Markdown links, section anchors, and plain-text routing hints in both role formats. Compare mirrored skills after edits. Link checks alone do not establish that useful instructions survived a move. Keep library documentation understandable without an agent guide, and keep detailed conventions intact as calculator routes are added.
