#!/usr/bin/env bash
# Apply ESLint fixes and Prettier formatting to the application.
#
# -e here, unlike build-app/tests/checks: formatting is a write operation, and if
# one formatter fails the tree is half-rewritten. Stopping leaves a smaller mess
# to reason about than continuing into the next rewrite.
set -euo pipefail

WORKSPACE_DIR="/workspace"

# Formatting mutates source files. Handle help before touching any formatter, and
# reject unsupported arguments rather than interpreting them as permission to
# rewrite the workspace.
if [ "$#" -eq 1 ] && { [ "$1" = "--help" ] || [ "$1" = "-h" ]; }; then
  echo "Usage: $0 (no arguments; format the application)"
  exit 0
fi
if [ "$#" -ne 0 ]; then
  echo "Usage: $0 (no arguments; format the application)" >&2
  exit 2
fi

# Print a formatter step to stderr so tool stdout remains available for reports.
info() {
  printf '\n=== %s ===\n' "$1" >&2
}

# Apply ESLint rewrites before Prettier settles the app's final layout.
format_app() {
  [ -f "${WORKSPACE_DIR}/package.json" ] || return 0
  info "App: ESLint fixes"
  npm --prefix "${WORKSPACE_DIR}" run lint:fix
  info "App: Prettier formatting"
  npm --prefix "${WORKSPACE_DIR}" run format
}

format_app

printf '\nFormatting complete.\n' >&2
