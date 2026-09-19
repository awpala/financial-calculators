# Development operations and validation

The application runs in one container described by [devcontainer.json](../../.devcontainer/devcontainer.json). [setup-env.sh](../../.devcontainer/scripts/setup-env.sh) installs OS/browser dependencies and the root npm lockfile, writes shell entries, and exposes live helpers for interactive and noninteractive shells. There is no service orchestration layer.

## Gates and commands

`run-checks` invokes [checks.sh](../../.devcontainer/scripts/bin/checks.sh). It runs the app and ADR-index gates, continues after a failure so the final summary is complete, and exits nonzero when any gate fails. Optional selectors are `app` and `docs`.

```sh
npm run check
npm run lint
npm run format:check
npm run test
npm run build
npm run test:deployment
```

The local app gate runs the static build and artifact smoke checks. CI runs the app gates followed by `npm run test:container`, which builds the production application once inside Docker and checks Nginx over HTTP without a preceding host build. Deployment checks cover packaging and serving; do not duplicate feature tests or enumerate example content. Docker is intentionally unavailable in the development container; leave the image check to CI, or use a separate Docker-capable host. Without `DEPLOYMENT_BASE_URL`, artifact tests explicitly skip the HTTP suite; with a URL, local artifact checks are skipped. `tests` runs Vitest; `format` runs ESLint fixes before Prettier; `build-app` cleans generated output, installs the lockfile, and builds. Diagram verification is separate from the fast ADR-index check because it launches Chromium.

## Container helper contracts

The workspace is fixed at `/workspace`, scripts at `/scripts`. Set `WORKSPACE_DIR="/workspace"` and derive paths from it; use `SCRIPTS_DIR="/scripts"` where needed. Do not add workspace-discovery logic or arbitrary overrides to scripts intended for this fixed container layout. npm commands remain usable directly on a host.

The setup script's `upsert_alias` calls are authoritative. Names use `app`: `run-app`, `check_app`, `format_app`, and the `$app` directory export. Profile entries are replaced idempotently, never appended as competing definitions. Symlinked command wrappers remain live as source changes. Runtime installation directories must not be hidden by persistent volumes.

The app launcher retains timestamped output and a latest symlink, records source revision and lifecycle events, and forwards signals to its process group. `kill-app` targets only the configured app port and verifies process identity before escalation. Neither helper starts unrelated services or kills arbitrary named processes.

## Provisioning and deployment

Keep provisioning comments explaining order, dependencies, failures, recovery, and ownership. Required installs fail loudly; never paper over a broken lockfile by falling back to npm install. No tracing or environment dumps should expose configuration during setup. Setup success means tools are ready, not that the app's gates or production deployment passed.

Use the [Coolify runbook](../runbooks/prod-deployment.md). Local validation does not authorize publishing, changing DNS, or modifying remote resources. Complete authorized preparation and report exactly which builds, browser interactions, and runtime checks were exercised.
