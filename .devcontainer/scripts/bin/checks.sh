#!/usr/bin/env bash
# Run every repository verification gate, in dependency order, and report a
# single pass/fail summary. This is the same set of commands the repository's
# agent instructions require before any non-trivial change is reported as done,
# and it is deliberately the same set .github/workflows/verify.yml runs -- a
# local gate that differs from CI is a gate that teaches people to ignore CI.
#
# Usage: checks.sh [app|docs]   (no argument runs everything)
#
# No -e: a failing app gate must not hide another diagnostic.
set -uo pipefail

WORKSPACE_DIR="/workspace"
APP_DIR="${WORKSPACE_DIR}"
declare -a FAILURES=()

if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [app|docs]" >&2
  exit 2
fi

# Run the command after its label and accumulate failures without hiding later
# gates. FAILURES owns the final exit status; individual commands may fail.
run_gate() {
  local label=$1
  shift
  echo
  echo "=== ${label} ==="
  if "$@"; then
    echo "--- PASS: ${label}"
  else
    echo "--- FAIL: ${label}" >&2
    FAILURES+=("$label")
  fi
}

# Verify a required path before its tier's gates. A damaged or wrongly mounted
# workspace must fail explicitly, never report success by skipping a tier.
require_path() {
  if [ ! -e "$1" ]; then
    echo "Required gate input missing: $1" >&2
    FAILURES+=("missing $1")
    return 1
  fi
}

# Run each app gate independently so the summary names every failed command.
check_app() {
  require_path "${APP_DIR}/package.json" || return
  run_gate "app: svelte-check" npm --prefix "${APP_DIR}" run check
  run_gate "app: eslint" npm --prefix "${APP_DIR}" run lint
  run_gate "app: prettier" npm --prefix "${APP_DIR}" run format:check
  run_gate "app: vitest" npm --prefix "${APP_DIR}" run test
  run_gate "app: static build" npm --prefix "${APP_DIR}" run build
  run_gate "app: deployment behavior" npm --prefix "${APP_DIR}" run test:deployment
}

# Check the ADR inventory without paying the browser cost of diagram rendering.
check_docs() {
  require_path "${WORKSPACE_DIR}/docs/adrs" || return
  # Mermaid rendering is deliberately not part of this gate: it launches a
  # browser per diagram, which turns a seconds-long check into a minutes-long
  # one. Run check-diagrams.sh directly for that.
  run_gate "docs: ADR index current" "${WORKSPACE_DIR}/.devcontainer/scripts/bin/check-adr-index.sh"
}

case "${1:-all}" in
  app) check_app ;;
  docs) check_docs ;;
  all)
    check_app
    check_docs
    ;;
  *)
    echo "Usage: $0 [app|docs]" >&2
    exit 2
    ;;
esac

echo
if [ ${#FAILURES[@]} -eq 0 ]; then
  echo "All gates passed."
  exit 0
fi
echo "Failed gates (${#FAILURES[@]}):" >&2
printf '  - %s\n' "${FAILURES[@]}" >&2
exit 1
