#!/usr/bin/env bash
# Render every Mermaid block in the repository's markdown and report the ones
# that fail to parse.
#
# A malformed diagram is invisible in review: the fenced block still looks like
# a diagram in the source, and only a renderer reveals that it produces nothing.
# Since diagrams carry real architectural meaning here, a silently broken one is
# documentation that lies.
#
# Usage: check-diagrams.sh [path ...]   (defaults to the authored markdown tree)
set -uo pipefail

WORKSPACE_DIR="/workspace"
RENDERER="${WORKSPACE_DIR}/.devcontainer/scripts/bin/mmdc.sh"
OUTPUT_DIR="$(mktemp -d)"
trap 'rm -rf "$OUTPUT_DIR"' EXIT

if [ ! -x "$RENDERER" ]; then
  echo "mermaid renderer not found at $RENDERER" >&2
  exit 1
fi

# Default scope includes new, untracked documentation under the workspace but
# excludes local scratch directories, run logs, build output, and dependencies.
if [ $# -gt 0 ]; then
  mapfile -t candidates < <(printf '%s\n' "$@")
else
  mapfile -t candidates < <(
    find "$WORKSPACE_DIR" -name '*.md' \
      -not -path '*/node_modules/*' \
      -not -path '*/.git/*' \
      -not -path "${WORKSPACE_DIR}/__refs/*" \
      -not -path "${WORKSPACE_DIR}/__logs/*" \
      -not -path '*/.svelte-kit/*' \
      -not -path '*/build/*' \
      | sort
  )
fi

declare -a failures=()
checked=0

for file in "${candidates[@]}"; do
  [ -f "$file" ] || { failures+=("$file (not a file)"); continue; }
  # Only pay the cost of a browser launch for files that contain a diagram.
  grep -q '^```mermaid' "$file" || continue

  checked=$((checked + 1))
  relative="${file#"$WORKSPACE_DIR"/}"
  output="${OUTPUT_DIR}/$(echo "$relative" | tr '/' '_').md"

  if error=$("$RENDERER" -i "$file" -o "$output" 2>&1); then
    printf '  ok    %s\n' "$relative"
  else
    printf '  FAIL  %s\n' "$relative"
    printf '%s\n' "$error" | sed 's/^/          /' | tail -n 5
    failures+=("$relative")
  fi
done

echo
if [ "$checked" -eq 0 ]; then
  echo "No markdown with Mermaid blocks found."
  [ ${#failures[@]} -eq 0 ]
  exit $?
fi
if [ ${#failures[@]} -eq 0 ]; then
  echo "All Mermaid diagrams in ${checked} file(s) render."
  exit 0
fi
echo "Mermaid failures in ${#failures[@]} of ${checked} file(s):" >&2
printf '  - %s\n' "${failures[@]}" >&2
exit 1
