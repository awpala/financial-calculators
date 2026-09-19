---
name: repo-review
description: Review a repository diff for concrete correctness, ownership, authorization, documentation, and validation defects without making edits.
---

Read the [shared implementation and review conventions](../../../docs/agents/workflow.md) for this specialty. Use the [root task directory](../../../AGENTS.md) to select additional guidance only when the assignment crosses that boundary; do not preload all agent guides or skill references.

# Repository review

Read [AGENTS.md](../../../AGENTS.md), the changed modules and their callers, and the relevant standalone README/ADR. Inspect the working-tree diff read-only; do not commit, reset, rewrite, or fix files as part of a review unless the user changes the task.

Prioritize observable defects: request ownership leaks, stale authorization, unsafe content boundaries, unowned background resources, static-content exposure, token validation, and SSR/client import mistakes. Use [module organization](../module-organization/SKILL.md) to assess cohesion and authorization boundaries rather than line counts.

Check public documentation against the actual contract, including defaults and teardown. Dependency changes require auditing duplicated executable pins and affected major-version prose. Check mirrored skills and behaviorally equivalent agent pairs when the harness changes. Do not treat a passing compiler as proof of runtime behavior or a public build as proof of password protection.

Review directory READMEs as stable module contracts: responsibility, boundaries, relationships, detailed usage, and extension criteria. Flag exhaustive file/component/export inventories and guides that equate a module with its initial file. Specific references must materially support the explanation, example, command, idiosyncrasy, or audit evidence. Preserve useful tables, diagrams, and comprehensive exposition. Check that moves update imports and relevant examples without leaving forwarding shims.

Determine exact versions before consulting first-party Svelte documentation. For the other ecosystems use the [controlled official sources](../../../docs/agents/tooling.md#mcp-servers) selected through AGENTS.md. Respect environment limits; report checks that were unavailable rather than installing tools or implying they passed.

Return findings ordered by severity with a concrete trigger, consequence, file/line, and suggested direction. Distinguish confirmed defects from unresolved questions. If no findings remain, say so and identify material validation gaps. Keep stylistic comments only when they violate an explicit repository contract or hide a practical defect.
