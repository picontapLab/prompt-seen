#!/bin/sh
# Host site rehearsal (design doc §15.4.4, docs/operations.md): builds the site for a host at
# http://127.0.0.1:$PORT under /prompt-seen, puts it behind a proxying "host" with its own robots.txt
# (deploy/hosts/rehearsal/), then runs check:live and the raw-HTTP end-to-end tests through the
# host. Needs Docker. `--no-build` reuses dist/ from an earlier run of this script.
set -eu
cd "$(dirname "$0")/.."
PORT="${PORT:-8091}"
export PORT SITE_ORIGIN="http://127.0.0.1:$PORT" BASE_PATH=/prompt-seen BUILD_MODE=production

if [ "${1:-}" != "--no-build" ]; then npm run build; fi

# The host's root: a home page and robots.txt = its own rules + the generated snippet.
HOST_ROOT=deploy/hosts/rehearsal/host-root
rm -rf "$HOST_ROOT" && mkdir -p "$HOST_ROOT"
printf '<!doctype html><title>Host site</title><h1>Host site</h1><a href="/prompt-seen/">Prompt Seen</a>\n' > "$HOST_ROOT/index.html"
{ printf 'User-agent: *\nDisallow: /admin/\n\n'; cat deploy/generated/robots-snippet.txt; } > "$HOST_ROOT/robots.txt"

COMPOSE="docker compose -f deploy/hosts/rehearsal/compose.yaml -p prompt-seen-rehearsal"
$COMPOSE up -d --wait
trap '$COMPOSE down --remove-orphans >/dev/null 2>&1' EXIT

for i in $(seq 1 30); do curl -fsS "$SITE_ORIGIN/prompt-seen/" >/dev/null 2>&1 && break; sleep 1; done
npm run check:live
# The same raw-HTTP tests as CI, now through the proxy; access logs come from the host.
npx playwright test --project=http
