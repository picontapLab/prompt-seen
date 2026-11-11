# Korean browser performance evidence

Measured `ko-preview-20261111-ime` against the packaged `/prompt-seen` preview served by reference nginx on local port 8101. Chrome version, Node version, timestamps, host load and complete samples are recorded in `browser-performance.json`. Production remains disabled.

## Method and limits

Each cold visit used a fresh browser context and disabled HTTP cache. Profiles were desktop 1440 × 900 without throttling, and phone 390 × 844 with the repository's Slow 4G settings (150 ms latency, 1.6 Mibit/s download, 750 Kibit/s upload) and 4× CPU slowdown. Routes were Korean home, Prompt list, and `p_151` detail. Metrics were collected through buffered PerformanceObservers, resource timing, and native Worker request/response timestamps. The Worker wrapper only observed outgoing sequence numbers and incoming messages; it did not change requests or responses.

For search, a separate cold context opened `/ko/search/?q=제품사진 스튜디오`, then entered `수묵화 매화`, `네온 포트레이트`, `제품 포스터`, and `제품사진 스튜디오` for three sequential rounds. Cold timing includes Worker startup, index fetch, JSON parsing, engine construction and the first search. Warm timing includes Worker message transport and search. Input-to-status timing ends at a MutationObserver observing the final query in the result status; it is not paint timing or INP.

One cold sample per route/profile and 12 warm queries are diagnostic measurements, not a statistical p75 study. The host was busy (initial load average 91.80/64.28/71.02). §16.1's LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 targets apply to real users after launch; they remain unverified. The design specifies no numerical search latency or index-size ceiling.

## Results

| Metric                                                   | Desktop      | Phone Slow 4G / 4× CPU |
| -------------------------------------------------------- | ------------ | ---------------------- |
| Cold search request → Worker result                      | 231.5 ms     | 2730.3 ms              |
| Warm Worker query, median / maximum                      | 0.7 / 3.5 ms | 9.5 / 12.8 ms          |
| Warm input → updated result status, maximum              | 8.6 ms       | 38.0 ms                |
| Home LCP / CLS                                           | 180 ms / 0   | 1796 ms / 0            |
| List LCP / CLS                                           | 160 ms / 0   | 1112 ms / 0            |
| Detail LCP / CLS                                         | 148 ms / 0   | 984 ms / 0             |
| Search index requests during the full search sequence    | 1            | 1                      |
| Search index requests on ordinary home/list/detail pages | 0 / 0 / 0    | 0 / 0 / 0              |

Observed first-screen image bytes were 16–391 KiB on desktop and 5–91 KiB on phone, below the approximately 600 KiB engineering budget for these sampled pages. Font resource URLs were unique within each visit; Korean display-font subsets were used. This does not replace visual glyph inspection or prove a global font budget.

## Initial JavaScript budget and baseline attribution

HTML-referenced scripts were deduplicated and compressed at gzip level 6, matching `scripts/measure-first-load.ts` and design §16.1. Idle preloads and route prefetches were excluded. `first-load-comparison.json` records every referenced script from the baseline build (`0306b74`, `ko-baseline-0306b74`) and current build.

| Page           | Baseline English | Current English | Current Korean | English change | Korean over current English |
| -------------- | ---------------- | --------------- | -------------- | -------------- | --------------------------- |
| Home           | 238224 B         | 238360 B        | 238384 B       | +136 B         | +24 B                       |
| Prompt list    | 246818 B         | 246952 B        | 246952 B       | +134 B         | 0 B                         |
| `p_151` detail | 234955 B         | 235089 B        | 235089 B       | +134 B         | 0 B                         |

Current initial JavaScript is 229.6–241.2 KiB and therefore exceeds the approximately 200 KiB suggested budget. The baseline already exceeds it; the Korean change adds only 134–160 bytes compared with baseline English. This is recorded as existing budget debt, not a Korean-specific payload regression or a passed budget. No unrelated performance optimization was introduced.

## Reproduction

From the repository root, build the preview with `BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build`, serve `dist/` with `PORT=8101 sh scripts/nginx.sh`, and run the capture runner with Node 24 in another terminal. For the first-load comparison, build both the original baseline and current checkout separately using the same preview mode and `/prompt-seen` base path; that runner reads this exact artifact layout:

```sh
node production/localization/ko/evidence/ko-browser-performance.mjs /path/to/worktree http://127.0.0.1:8101 /tmp/ko-browser-performance.json
node production/localization/ko/evidence/ko-first-load-compare.mjs /path/to/baseline /path/to/current /tmp/ko-first-load-comparison.json
```

The capture runner requires the worktree's existing Playwright/Chrome installation, discovers the packaged build configuration, and rejects a served build ID mismatch. The comparison runner reads both independent packaged builds without starting a server. The source of both runners is retained alongside this evidence.
