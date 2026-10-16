#!/bin/sh
# Serve dist/ under /prompt-seen/ with the reference nginx (foreground; Ctrl-C stops and removes it).
set -eu
cd "$(dirname "$0")/.."
PORT="${PORT:-8090}"
exec docker run --rm --name prompt-seen-spike-nginx -p "127.0.0.1:${PORT}:80" \
  -v "$PWD/dist:/srv/dist:ro" \
  -v "$PWD/deploy/nginx/host-server.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/deploy/nginx:/etc/nginx/prompt-seen:ro" \
  nginx:stable
