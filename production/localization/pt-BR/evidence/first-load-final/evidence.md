# Final enabled first-load JavaScript measurement

Local production root artifact `b8e0e7e392ff8fd259a8ef91aa40817de35bca75`. Measured 2026-11-11T16:29:03.025Z through 2026-11-11T16:29:40.500Z; no deployment performed.

All five routes returned HTTP 200 with expected HTML language before measurement. HTTP build ID matched the local artifact before measurement and remained unchanged after it. The prompt route is `/pt-br/prompts/plum-branch-in-ink/`; no 404 response is included.

The repository's `scripts/measure-first-load.ts --no-prefetch` used Chromium, a fresh context per route, gzip level 6 and a six-second idle interval. Router `.txt` prefetch was blocked. Numbers describe transferred JavaScript bodies after gzip, not latency or LCP.

| Page | First load (HTML scripts) | After 6 s idle, no prefetch |
| --- | --- | --- |
| / | 15 scripts, 194.0 KiB | 22 scripts, 263.3 KiB |
| /en/search/ | 14 scripts, 187.3 KiB | 23 scripts, 251.3 KiB |
| /pt-br/ | 15 scripts, 194.0 KiB | 22 scripts, 263.4 KiB |
| /pt-br/prompts/plum-branch-in-ink/ | 14 scripts, 190.8 KiB | 19 scripts, 245.8 KiB |
| /pt-br/templates/product-poster/ | 16 scripts, 206.2 KiB | 21 scripts, 261.3 KiB |


[Raw output](first-load.txt) · [Build and route preflight](evidence.json) · [stderr](stderr.txt)

[Disabled control output](disabled-control.txt) records the same application/content revision with only Portuguese disabled: homepage 194.0 / 263.3 KiB and English search 187.3 / 251.3 KiB. Enabled and disabled English measurements are identical at the reported 0.1 KiB precision. [Disabled artifact](../../artifact-final-disabled.json) and [enabled artifact](../../artifact-final-root.json) retain full file, HTML/JSON and per-language index sizes; [disabled build](../../build-final-disabled.json) and [enabled build](../../build-final-root.json) retain actual build times. These individual build-time samples are not a controlled latency comparison. All browser contexts were closed and the temporary port 8097 nginx container was stopped and removed after measurement.
