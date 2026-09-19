#!/usr/bin/env bash
# Build and test the production image locally or in CI. Docker owns the isolated
# Nginx process; the shell owns cleanup on success, failure, or interruption.
# A random loopback port avoids the dev server and never exposes a host listener.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker is required for the production-image check.' >&2; exit 1; }

image_id_file=$(mktemp)
container_id=''
cleanup() {
  if [ -n "$container_id" ]; then
    docker logs "$container_id" || true
    docker stop "$container_id" >/dev/null || true
  fi
  if [ -s "$image_id_file" ]; then
    docker image rm "$(cat "$image_id_file")" >/dev/null || true
  fi
  rm -- "$image_id_file"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# An untagged image and exact container ID keep cleanup scoped to this run.
docker build --iidfile "$image_id_file" .
container_id=$(docker run --detach --rm --publish 127.0.0.1::8080 "$(cat "$image_id_file")")
container_address=$(docker port "$container_id" 8080/tcp)
DEPLOYMENT_BASE_URL="http://${container_address}" node --test scripts/deployment.test.mjs
