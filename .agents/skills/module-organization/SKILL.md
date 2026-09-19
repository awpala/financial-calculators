---
name: module-organization
description: Place or refactor modules by responsibility, class ownership, and authorization boundary when adding files or moving existing code.
---

Read the [shared workflow and module organization](../../../docs/agents/workflow.md) for this specialty. Use the [root task directory](../../../AGENTS.md) to select additional guidance only when the assignment crosses that boundary; do not preload all agent guides or skill references.

# Module organization

Read the [organization decision](../../../docs/adrs/module-organization.md) and the affected library's README before changing its structure.

- Keep one class per file with helpers and types belonging to its contract. A private error type beside its owning class is cohesive. Related contract records can remain together when they describe one boundary.
- Pure functions need no class. A small helper needs no file solely to satisfy a size target.
- Name subfolders for responsibilities such as persistence, presentation, navigation, parsers, or timing. Avoid utils, common, shared, and misc.
- Keep a domain root focused on contracts and composition; place distinct implementations under the responsibility they serve.
- Keep document preparation behind the server-only boundary and public output independent of request identity.
- Extract a rule only when its callers actually share that rule. Keep instance state and teardown with the owner; do not turn a reusable helper into process-global interactive state.
- Preserve a long cohesive controller when its state and lifecycle belong together. Line count alone does not justify splitting it.
- Update all importers when moving code. Remove retired paths instead of leaving forwarding files or barrel exports as compatibility shims.
- Anchor directory READMEs to stable responsibilities, ownership, module relationships, and extension criteria. Do not duplicate the source tree with exhaustive file/component/export catalogs. Keep specific references when they materially explain a contract, example, command, idiosyncrasy, or audit finding. Retain comprehensive exposition, useful tables, and diagrams; remove inventory columns rather than the explanatory structure.

Check imports, public documentation, standalone library READMEs, and the affected service gate after a relocation. Report why the resulting boundary is easier to review, not merely how many files became shorter.
