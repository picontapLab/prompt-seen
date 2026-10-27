# Host site examples

Hand-written examples for a host site that forwards `/prompt-seen/` to this site's static
hosting (design doc §15.4.1, way 3). They are not generated and not used by the build.

| File                                           | For                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`nginx-proxy.conf`](nginx-proxy.conf)         | a host on nginx, forwarding to Cloudflare Pages                                    |
| [`cloudflare-worker.js`](cloudflare-worker.js) | a host on Cloudflare, forwarding with a Worker on `xxx.com/prompt-seen*`           |
| [`rehearsal/`](rehearsal/)                     | `scripts/host-rehearsal.sh`: the same setup on this machine, with a Pages stand-in |

A host that serves the files itself (way 1) uses [`../nginx/host-server.conf`](../nginx/host-server.conf)
with the generated include instead.

Every form must keep the path, status codes and headers, drop `X-Robots-Tag` from Pages
responses, and merge `deploy/generated/robots-snippet.txt` into the host's `robots.txt`.
[`docs/operations.md`](../../docs/operations.md) ("The host site") explains why, and
`npm run check:live` checks it.
