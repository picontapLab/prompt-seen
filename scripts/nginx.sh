#!/bin/sh
# Serves dist/ with the reference nginx (foreground; Ctrl-C stops and removes the container).
# Run `npm run build` first. The generated include matches the base path of that build.
set -eu
cd "$(dirname "$0")/.."
PORT="${PORT:-8090}"
exec docker run --rm --name "prompt-seen-nginx-${PORT}" -p "127.0.0.1:${PORT}:80" \
  -v "$PWD/dist:/srv/dist:ro" \
  -v "$PWD/deploy/nginx/host-server.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/deploy/generated/nginx:/etc/nginx/prompt-seen:ro" \
  nginx:stable
