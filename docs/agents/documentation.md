# Documentation contracts and version policy

Read this guide when writing or reviewing documentation, public API comments, provisioning explanations, or dependency-version claims. Its requirements apply across services, libraries, decisions, runbooks, and the agent harness.

## Application documentation

Application behavior is documented against the current implementation. Service READMEs and ADRs explain the application independently of LLM harness instructions; never make a service README depend on this file. README summary tables and diagrams stay at module granularity, with individual implementation files named only when needed for a command or focused explanation. Keep Svelte prop comments on separate lines at the same indentation as their properties.

The application carries a README, and so does every sub-library inside `src/lib/` that is substantial enough to be lifted into another project on its own. Those sub-library READMEs are standalone: they are written for a reader who opened that directory and nothing else.

**A directory README describes a stable module boundary.** Lead with its responsibility, ownership, relationships, and extension criteria, even when it currently contains one file. Summaries and diagrams refer to modules, capability groups, and data flow; do not maintain exhaustive file, component, or export inventories that duplicate the source tree. Name a particular file or component only when it materially supports a contract explanation, a useful example, a required command, an important idiosyncrasy, or an audit finding. Preserve comprehensive exposition and useful tables/diagrams; remove inventory columns rather than discarding the explanation they accompany. Adding an ordinary member within an established boundary should not require updating a README roster.

**Preserve explanatory depth.** When updating documentation, retain comprehensive exposition, rationale, supported syntax, examples, warranted Mermaid diagrams, comparison tables, lifecycle rules, failure modes, and operating procedures. Keep domain descriptions and implementation details accurate for Financial Calculators; do not replace a mature document with an outline merely because the current application is small.

READMEs explain how the subsystem works and how to use and extend it. ADRs retain the context, alternatives, mechanisms, consequences, and limitations behind each decision. Runbooks are complete operational procedures: preparation, configuration, execution, verification, diagnosis, and recovery. Describe actual application behavior separately from lessons or mechanisms requiring future implementation; support test results, benchmarks, and domain guarantees with evidence from this repository. Review loss of relevant explanatory depth as a documentation regression.

**Provisioning comments are part of the operational documentation.** Keep [.devcontainer/scripts/setup-env.sh](../../.devcontainer/scripts/setup-env.sh) comprehensively annotated: execution context, step ordering, package/tool choices, pin alignment, shell behavior, generated artifacts, service ownership, failure handling, and recovery explain how to maintain the environment. Apply the same standard to other infrastructure files where the reasoning belongs beside the setting. Update comments when behavior changes; do not strip them as stylistic cleanup or replace them with a link to a separate guide.

### Required Scratchpad documentation check

Documentation review and true-up are a completion requirement for every change affecting Scratchpad's language or user-visible workspace behavior, even when the user requests only code. Language design, syntax, operators, function arguments, grouping and separators, numeric semantics, parsing, evaluation, diagnostics, highlighting, keyboard shortcuts, named bindings, and persistence all fall within this requirement. Changes through shared components or helpers count when they affect Scratchpad; parser or evaluator refactors must still confirm that documented behavior is preserved.

1. Before implementation, read the affected sections of the [Scratchpad language specification](../scratchpad.md) and [calculator library guide](../../src/lib/calculator/README.md). The specification owns the user's supported language and workflow; the library guide explains the implemented grammar, semantics, contracts, and ownership.
2. Compare the intended and implemented behavior with both documents. Update every affected explanation, grammar rule, syntax/reference table, example, accepted or rejected input, diagnostic, default, limit, and workflow in the same change. Review the [in-app syntax reference](../../src/lib/components/views/scratchpad/SyntaxReference.svelte) and [application overview](../../README.md#scratchpad) when their descriptions or examples are affected. Preserve explanatory depth, and label proposed behavior explicitly rather than presenting unimplemented syntax as supported.
3. Validate changed claims and examples against the implementation and relevant parser/evaluator tests or browser behavior. Run the affected gates within the authorized environment. Passing code checks or the ADR-index gate does not establish that prose, examples, or the documented language remain accurate.
4. Before reporting completion, identify the documentation reviewed, the sections updated, and the validation performed. If a reviewed document needs no edit, state why its current content still covers the change; do not make a cosmetic edit merely to produce a documentation diff.

Do not report a Scratchpad task complete until this check is satisfied. Reviewers must check the specification and library guide against the behavioral diff and report missing documentation updates or missing review evidence as a required correction, even when code checks pass. Documentation already corrected during implementation still requires this explicit completion check; accuracy must not depend on an incidental edit or a later user reminder.

## Documentation version policy

This policy is repository-wide. It applies to READMEs, ADRs, runbooks, `AGENTS.md`, `docs/agents/`, `.agents/skills/`, `.claude/agents/`, `.codex/agents/`, `.claude/skills/`, and dependency-version claims in comments.

- Prose names dependency, runtime, framework, and tool **major versions only**. Exact minor and patch versions belong only in authoritative executable configuration, manifests, lockfiles, container image tags, workflow inputs, and generated artifacts.
- A documentation agent working on any dependency upgrade must inspect the relevant manifests, lockfiles, Dockerfiles, Compose files, workflow files, and setup scripts; verify that every duplicated exact pin remains aligned; and audit all repository prose and agent instructions for affected claims.
- A minor or patch upgrade does not change a version number in prose. Update prose only when behavior changed, without copying the exact pin. A major upgrade must update every affected major-version reference and compatibility claim in the same change.
- Documentation reviewers must reject minor or patch dependency versions in prose and must flag a major-version reference that no longer matches authoritative configuration. Protocol identifiers, schema versions, migration versions, domain constants, and historical dates are not dependency pins and are exempt.

### Standing do-not-bump notes

These compatibility constraints look stale to a tool that reads dist-tags, and moving them breaks the gates. They are the one sanctioned place to name a version range in prose, because the range _is_ the reason.

- **TypeScript stays on 6.** TypeScript 7 is `latest` on npm and this project must not take it yet. `typescript-eslint` declares a peer range of `>=4.8.4 <6.1.0` and `svelte-check` declares `^5.0.0 || ^6.0.0`, so TypeScript 7 breaks `npm run lint` and `npm run check` on installation. Svelte 5 and SvelteKit 3 compatibility with TypeScript 7 has also not been announced — it is expected, but it is not here. Revisit only when all three have moved.
- **`@sveltejs/kit` and `@sveltejs/adapter-static` stay on their stable Kit 3-compatible major lines.** Their `latest` dist-tags now target Kit 3, so normal stable updates preserve this stack.
- **`vitest` and `@vitest/coverage-v8` move in lockstep and must stay at the same version.** The coverage provider is versioned against the runner's internals; a mismatched pair fails at collection time rather than at install time.
