#!/usr/bin/env bash
# Run on the host to remove this project's standalone development container.
# Dependency caches and CLI auth volumes are preserved unless --volumes is
# explicitly requested. The workspace is a bind mount and is never removed.
set -euo pipefail
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "--volumes" ) ]]; then
  echo "Usage: $0 [--volumes]" >&2
  exit 2
fi
container_name="financial-calculators-dev-env"
if docker container inspect "$container_name" >/dev/null 2>&1; then
  docker container rm --force "$container_name"
fi
if [[ "${1:-}" == "--volumes" ]]; then
  # An explicit list avoids deleting another project's similarly named volume.
  for suffix in npm-cache node-modules gh-config claude-config codex-config; do
    volume_name="financial-calculators_${suffix}"
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
      docker volume rm "$volume_name"
    fi
  done
fi
echo "Reopen the folder in the dev container to rebuild it."
