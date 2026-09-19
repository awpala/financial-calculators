#!/usr/bin/env bash
# Render through the repository-pinned CLI with the root container's browser flags.
set -euo pipefail
WORKSPACE_DIR="/workspace"
CONFIG="${WORKSPACE_DIR}/.devcontainer/mermaid/puppeteer-config.json"
CLI="${WORKSPACE_DIR}/node_modules/.bin/mmdc"
if [ ! -x "$CLI" ]; then
  echo "Mermaid CLI is missing; run npm ci --prefix /workspace." >&2
  exit 1
fi
exec "$CLI" --puppeteerConfigFile "$CONFIG" "$@"
