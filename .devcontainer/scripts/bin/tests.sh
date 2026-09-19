#!/usr/bin/env bash
# Run every application unit-test suite once, continuing after failures.
# Usage: tests
#
# No -e, for the same reason as build-app.sh: one run should name every suite
# that is red.
set -uo pipefail

WORKSPACE_DIR="/workspace"

if [ "$#" -ne 0 ]; then
  echo "Usage: tests" >&2
  exit 2
fi

declare -a FAILED=()

# run_suite preserves the suite's output and records failure without stopping.
run_suite() {
  local name=$1
  shift
  printf '\n=== %s ===\n' "$name"
  if "$@"; then
    return 0
  fi
  FAILED+=("$name")
}

run_suite "App: Vitest" npm --prefix "${WORKSPACE_DIR}" run test

echo
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "All unit-test suites passed."
  exit 0
fi
echo "Failed unit-test suites (${#FAILED[@]}):" >&2
printf '  - %s\n' "${FAILED[@]}" >&2
exit 1
