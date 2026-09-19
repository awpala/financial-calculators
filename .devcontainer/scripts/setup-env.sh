#!/usr/bin/env bash
# Financial Calculators -- single-container development provisioning.
# Invoked as root by devcontainer.json after its Node feature is installed.
# The checkout and live scripts are bind-mounted at /workspace and /scripts.
# Keep ordering explicit: shell profile -> OS/browser -> CLI -> npm lockfile ->
# handoff. Failed installs stop setup; rerun bash /scripts/setup-env.sh to retry.
# This script prepares tools inside the development container; it must never
# be used to provision the host.

# A failed dependency install is a failed setup. Do not turn required commands
# into best-effort `... || echo` steps: that leaves an apparently ready editor
# whose first build fails much later, far from the original cause. Undefined
# variables and failed pipelines also fail rather than silently carrying on.
set -euo pipefail

# Absolute paths work from interactive terminals and agent subprocesses.
# node_modules and npm cache have dedicated volumes. Never mount a volume over
# /usr/local/bin or the Node installation: it hides newly rebuilt image tools
# behind stale volume contents. Logs append in /tmp across retries.
WORKSPACE_DIR="/workspace"
SCRIPTS_DIR="/scripts"
SCRIPTS_BIN_DIR="${SCRIPTS_DIR}/bin"
BASH_RC="/root/.bashrc"
BASH_ALIASES="/root/.bash_aliases"
LOGFILE="/tmp/setup-env-debug.log"
# postCreateCommand has no operator to answer package configuration or service
# restart prompts. apt's switches and these environment values handle its
# normal unattended paths; closing stdin below is the backstop for an installer
# that still tries to ask. A prompt must encounter EOF, not hang setup forever.
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# Puppeteer is pulled in by the repository's Mermaid tooling. Its install hook
# would otherwise download another browser. Both render paths use the apt
# Chromium selected by PUPPETEER_EXECUTABLE_PATH in devcontainer.json, so skip
# the redundant download and install the system browser explicitly below.
export PUPPETEER_SKIP_DOWNLOAD=true
exec < /dev/null

# Preserve installer output for diagnosis while keeping it visible in the
# post-create terminal. Append so a retry does not erase the preceding failure.
# Never add `set -x`, a sorted environment dump, or a trap that prints the
# failing command: deployment configuration may contain sensitive values.
# This is ordinary command output, not a secret-redaction layer; inspect a log
# before sharing it, especially if an installer has printed a configured URL.
exec > >(tee -a "$LOGFILE") 2>&1

# on_error reports the failing location and preserves its status without
# echoing BASH_COMMAND or environment values. Keep the log path in the message
# so the concrete installer error can be found without rerunning under tracing.
on_error() {
  local status=$?
  echo "Setup failed at line ${BASH_LINENO[0]} (exit ${status}); see ${LOGFILE}." >&2
  exit "$status"
}
trap on_error ERR

echo
echo "===== setup-env.sh START ====="
date -u
echo "Workspace: $WORKSPACE_DIR"
echo "Setup log: $LOGFILE"
echo

# ---------------------------------------------------------------------------
# Shell configuration and command entry points
# ---------------------------------------------------------------------------
# Repeated setup must replace a definition rather than append another alias.
# Bash accepts duplicates and silently uses the last one, which can keep an old
# command alive after its wrapper has moved. shell-profile.sh owns the upsert
# mechanics; this file owns the intended names and targets. Only add the
# .bash_aliases hook when absent, preserving other root shell customization.
echo "--- Configuring the Bash profile ---"
touch "$BASH_RC" "$BASH_ALIASES"
if ! grep -q 'bash_aliases' "$BASH_RC"; then
  cat >> "$BASH_RC" <<'PROFILE'
if [ -f ~/.bash_aliases ]; then
  . ~/.bash_aliases
fi
PROFILE
fi
# shellcheck source=lib/shell-profile.sh
. "${SCRIPTS_DIR}/lib/shell-profile.sh"

# The base image's .bashrc aliases are not a stable interface: image and
# common-utils revisions may omit them, leave them commented, or use a different
# set. Write the ad hoc directory-listing conveniences into the profile we own
# so `ll` and its companions are available after every fresh container setup.
# These upserts also repair stale definitions without duplicating aliases when
# setup is retried. The .bashrc sourcing hook above makes them interactive-shell
# commands; they intentionally are not installed as executables on PATH.
upsert_alias ls 'ls --color=auto'
upsert_alias ll 'ls -alF'
upsert_alias la 'ls -A'
upsert_alias l 'ls -CF'

# Retain the reference repositories' initialization of any color and listing
# aliases supplied by the base image. Explicit aliases above guarantee the
# commands; this pass also preserves the image's related shell conveniences.
echo
echo "--- Post-processing .bashrc ---"
if [ -f "$BASH_RC" ]; then
  echo "Patching $BASH_RC (uncommenting colorized LS aliases)"
  sed -i -E 's/^#\s*export\s+/export /' "$BASH_RC" || true
  sed -i -E 's/^#\s*eval\s+/eval /' "$BASH_RC" || true
  sed -i -E 's/^#\s*alias\s+l/alias l/' "$BASH_RC" || true
fi

# Directory shortcuts are paths, not shell startup `cd` commands. A terminal
# stays where its caller opened it; `cd "$app"` is an explicit convenience.
echo
echo "--- Writing directory exports and run-* aliases ---"
upsert_export app "$WORKSPACE_DIR"

# `pe` is an explicit operator diagnostic, never something setup invokes or
# logs automatically: printenv exposes the inherited application secrets.
upsert_alias pe 'printenv'

# The application launcher owns npm's process group and timestamped logs.
# Setup never starts an extra listener behind the developer's terminal.
upsert_alias run-app "${SCRIPTS_BIN_DIR}/run-local-service.sh app"

# Verification and diagnostics share the checked-in wrappers used by agents.
# The stop helper targets only the configured application listener.
upsert_alias run-checks "${SCRIPTS_BIN_DIR}/checks.sh"
upsert_alias build-app "${SCRIPTS_BIN_DIR}/build-app.sh"
upsert_alias tests "${SCRIPTS_BIN_DIR}/tests.sh"
upsert_alias format "${SCRIPTS_BIN_DIR}/format.sh"
upsert_alias kill-app "${SCRIPTS_BIN_DIR}/kill-app.sh"
upsert_alias mmdc "${SCRIPTS_BIN_DIR}/mmdc.sh"

# Bash aliases normally exist only in interactive shells. CI-like commands and
# agent subprocesses must also find the shared gates, so expose real commands
# on PATH as symlinks to the live /scripts mount. Do not copy the wrappers:
# copied versions silently drift from the repository on the next edit.
# The run-app convenience remains an alias; a noninteractive caller invokes
# /scripts/bin/run-local-service.sh app.
# chmod repairs execute bits on the writable script mount where necessary.
echo
echo "--- Installing command links for non-interactive shells ---"
chmod +x "${SCRIPTS_BIN_DIR}"/*.sh
ln -sf "${SCRIPTS_BIN_DIR}/build-app.sh" /usr/local/bin/build-app
ln -sf "${SCRIPTS_BIN_DIR}/format.sh" /usr/local/bin/format
ln -sf "${SCRIPTS_BIN_DIR}/kill-app.sh" /usr/local/bin/kill-app
ln -sf "${SCRIPTS_BIN_DIR}/checks.sh" /usr/local/bin/run-checks
ln -sf "${SCRIPTS_BIN_DIR}/tests.sh" /usr/local/bin/tests
ln -sf "${SCRIPTS_BIN_DIR}/mmdc.sh" /usr/local/bin/mmdc

# ---------------------------------------------------------------------------
# OS tooling and headless Chromium
# ---------------------------------------------------------------------------
# Chromium has TWO current consumers; neither is optional merely because the
# other was not needed for today's edit:
#
# 1. The mmdc wrapper renders documentation diagrams through the repository's
#    Mermaid CLI. Its Puppeteer config supplies --no-sandbox and
#    --disable-setuid-sandbox because this development container runs as root.
#    A bare root launch otherwise fails before rendering begins.
# 2. src/lib/server/mermaid-cli.ts enriches application markdown with SVG
#    during prerendering and development. It uses the same system browser and supplies its own
#    launch flags, render deadlines, and per-attempt browser cleanup.
#
# The wrapper flags do not configure the server path; preserve both launch
# owners. Browser installation alone is not proof that either rendering path
# works. The library's mocked lifecycle tests and a real Chromium render check
# exercise different boundaries.
#
# Install Chromium itself and let apt resolve its required shared libraries.
# The reference's hand-maintained libglib/libasound/etc. list broke as distro
# package names and ABI transitions changed; listing those libraries separately
# can make setup fail even while the distro's Chromium package is installable.
# fonts-liberation supplies predictable common fonts despite omitting optional
# recommended packages. ca-certificates/curl/gnupg support the vendor downloads,
# ripgrep supports source search, iproute2 supplies listener diagnostics, and
# build-essential supplies native compilation tools for dependency builds.
#
# Do not install another global TypeScript or Mermaid tree here. The optional
# TypeScript feature supplies an ad hoc command; project TypeScript, the
# first-party Svelte MCP, and Mermaid resolve from package-lock.json. The
# selected language features provide runtimes; the checkout provides its tools.
# The separate sv CLI is installed globally below for ad hoc command-line use;
# it does not replace those project-local tools.
echo
echo "--- Refreshing package metadata ---"
apt-get update
echo
echo "--- Installing Chromium, fonts, search, and build tools ---"
apt-get install --yes --no-install-recommends \
  chromium fonts-liberation ca-certificates curl gnupg ripgrep iproute2 build-essential

# ---------------------------------------------------------------------------
# First-party Svelte CLI
# ---------------------------------------------------------------------------
# Install sv globally for ad hoc use inside the development container. The
# explicit /usr/local prefix puts its executable on the shared command path,
# including noninteractive shells, without adding it to the app's dependencies.
# npm installs the published release and safely refreshes it when setup reruns.
# This runs only in the disposable dev container; it is not a host installer.
# Setup installs the CLI and reports its version. Project creation, add-ons,
# and migrations are commands the developer invokes separately as needed.
echo
echo "--- Installing the Svelte CLI globally ---"
npm install --global --prefix /usr/local --no-audit --no-fund sv
sv --version

# ---------------------------------------------------------------------------
# Application dependencies and operator handoff
# ---------------------------------------------------------------------------
# npm ci reconstructs the checked-in dependency tree in the container volume.
# Never fall back to npm install on failure: that conceals lockfile drift.
# Mermaid and the Svelte MCP use this local install; no global copy competes.
echo
echo "--- Installing application dependencies from the npm lockfile ---"
npm ci --prefix "$WORKSPACE_DIR"

echo
echo "===== setup-env.sh END ====="
# Writing the profile does not update an already-open shell. Only announce
# readiness after every install succeeds. Readiness is not build validation.
cat <<'HELP'

Development setup completed. Open a new terminal to load these commands.
Setup log: /tmp/setup-env-debug.log

  run-app              Start SvelteKit on 2252; Ctrl-C owns shutdown
  run-checks          Run app and documentation gates, with a failure summary
  tests               Run the Vitest suite
  format              Apply ESLint fixes, then Prettier
  build-app            Clean generated output, npm ci, and build static output
  kill-app             Stop only the configured application listener
  mmdc                Render Mermaid with the container's Chromium flags

Directory shortcuts: cd "$app" (/workspace).
Production runbook: docs/runbooks/prod-deployment.md.
HELP
