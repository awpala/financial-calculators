# Architecture and operations

These decisions document Financial Calculators' architecture, rationale, and operational lessons. It is one public static application with explicit library organization, presentation contracts, and ownership conventions.

| Decision | Status | Scope |
| --- | --- | --- |
| [Local development](adrs/local-development-environment.md) | Accepted | One devcontainer, setup ordering, persistence, live helpers |
| [Object lifetime](adrs/objects-lifetime-management.md) | Accepted | Component, request, build, browser, and process ownership |
| [Style and design system](adrs/style-design-system.md) | Accepted | Controls, surfaces, geometry, interaction contracts |
| [Markdown](adrs/markdown-subsystem.md) | Accepted | Typed syntax, safe transforms, rendering |
| [Module organization](adrs/module-organization.md) | Accepted | Cohesion, responsibility, direct imports |
| [Deployment](adrs/deployment.md) | Accepted | Public static output, Coolify hosting, and CI gates |

Start with the [development setup](../README.md#development-setup) and [application guide](app.md). Operational procedures live in the [Coolify runbook](runbooks/prod-deployment.md). The [agent directory](../AGENTS.md) carries coding conventions, while each library README explains its own contract independently.

Keep decision records current when the application changes a boundary. `check-adr-index.sh` verifies that this index matches the files on disk; `check-diagrams.sh` separately renders authored diagrams with Chromium. Historical reference audit results are not validation evidence for this repository.
