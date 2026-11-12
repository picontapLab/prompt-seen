import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
const root = process.argv[2];
const origin = process.argv[3] ?? "http://127.0.0.1:8101";
const output = process.argv[4] ?? "/tmp/ko-browser-performance.json";
if (!root)
  throw new Error(
    "Usage: node ko-browser-performance.mjs WORKTREE [ORIGIN] [OUTPUT]",
  );
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("@playwright/test");
function findBuild(dir, depth = 0) {
  const candidate = path.join(dir, "generated/build.json");
  if (fs.existsSync(candidate)) return candidate;
  if (depth > 3) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !e.name.startsWith("_")) {
      const found = findBuild(path.join(dir, e.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}
const build = JSON.parse(
  fs.readFileSync(findBuild(path.join(root, "dist")), "utf8"),
);
if (!build.locales.some((l) => l.code === "ko"))
  throw new Error("Built artifact must include Korean");
const served = await (
  await fetch(`${origin}${build.basePath}/generated/build.json`)
).json();
if (served.buildId !== build.buildId)
  throw new Error("Served build differs from disk");
const prompt = JSON.parse(
  fs.readFileSync(
    path.join(root, ".generated/content/ko/prompt/p_151.json"),
    "utf8",
  ),
);
const profiles = [
  { name: "desktop", width: 1440, height: 900, phone: false, cpuRate: 1 },
  { name: "phone-slow4g", width: 390, height: 844, phone: true, cpuRate: 4 },
];
const report = {
  timestamp: new Date().toISOString(),
  buildId: build.buildId,
  buildMode: build.buildMode,
  basePath: build.basePath,
  origin,
  node: process.version,
  platform: process.platform,
  cpus: os.cpus().length,
  loadavg: os.loadavg(),
  method: {
    cache: "Fresh context and Network.setCacheDisabled for every page",
    profiles,
    slow4g: {
      latencyMs: 150,
      downloadBytesPerSecond: (1.6 * 1024 * 1024) / 8,
      uploadBytesPerSecond: (750 * 1024) / 8,
    },
    sampleCount:
      "One cold visit per route/profile; three rounds of four warm queries per profile",
    workerTiming:
      "Native Worker postMessage to corresponding message event; includes startup/fetch/parse for cold request, messaging + search for warm request",
    renderTiming:
      "input event to MutationObserver seeing committed query in search status; includes React scheduling and DOM update, not paint or real-user INP",
    labLimit:
      "Single-host lab diagnostics; field p75 and production budgets remain unverified",
    budgetSource:
      "docs/prompt-library-website-design.md §16.1: field p75 LCP<=2500 ms, INP<=200 ms, CLS<=0.1; initial JS approximately200 KiB, first-screen images approximately600 KiB; no numerical search-index/latency budget",
  },
  profiles: [],
};
const init = `(() => {
 const m=window.__koPerf={lcp:0,cls:0,longestTask:0,blockingMs:0,worker:[],renders:[],inputStarted:null};
 new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)m.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 new PerformanceObserver(l=>{m.lcp=l.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(l=>{for(const e of l.getEntries()){m.longestTask=Math.max(m.longestTask,e.duration);m.blockingMs+=Math.max(0,e.duration-50);}}).observe({type:'longtask',buffered:true});
 const NativeWorker=window.Worker;
 window.Worker=class extends NativeWorker{
  constructor(...args){super(...args);this.__sent=new Map();this.addEventListener('message',e=>{const request=this.__sent.get(e.data.seq);if(request){m.worker.push({...request,responseType:e.data.type,elapsedMs:performance.now()-request.start,total:e.data.results?.total});this.__sent.delete(e.data.seq);}});}
  postMessage(message,...rest){this.__sent.set(message.seq,{type:message.type,query:message.query,seq:message.seq,start:performance.now()});return super.postMessage(message,...rest);}
 };
 document.addEventListener('input',e=>{if(e.target.id==='search-field')m.inputStarted={query:e.target.value,start:performance.now()};},true);
 new MutationObserver(()=>{const pending=m.inputStarted;if(!pending)return;const status=document.querySelector('[data-search-status]');if(status?.textContent.includes(pending.query)){m.renders.push({query:pending.query,elapsedMs:performance.now()-pending.start});m.inputStarted=null;}}).observe(document,{childList:true,subtree:true,characterData:true});
})()`;
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? "chrome",
});
report.browserVersion = browser.version();
async function prepare(profile) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    isMobile: profile.phone,
    hasTouch: profile.phone,
  });
  const page = await context.newPage();
  await page.addInitScript(init);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile.phone) {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  return { context, page, requests };
}
function htmlScriptBytes(html) {
  const urls = [
    ...new Set(
      [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]),
    ),
  ];
  let bytes = 0;
  for (const url of urls) {
    const file = path.join(root, "dist", new URL(url, origin).pathname);
    if (!fs.existsSync(file)) throw new Error(`HTML script missing: ${file}`);
    bytes += gzipSync(fs.readFileSync(file), { level: 6 }).length;
  }
  return { scripts: urls.length, gzipLevel: 6, bytes };
}
try {
  for (const profile of profiles) {
    const result = { name: profile.name, pages: [], search: {} };
    report.profiles.push(result);
    for (const route of ["/ko/", "/ko/prompts/", prompt.path]) {
      const { context, page, requests } = await prepare(profile);
      const response = await page.goto(`${origin}${build.basePath}${route}`, {
        waitUntil: "load",
        timeout: 120000,
      });
      await page.waitForFunction(
        () =>
          Object.keys(
            document.querySelector("[data-search-launcher]") ?? {},
          ).some((k) => k.startsWith("__reactProps")),
        null,
        { timeout: 60000 },
      );
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => ({
        metrics: window.__koPerf,
        resources: performance
          .getEntriesByType("resource")
          .map((r) => ({
            name: r.name,
            initiatorType: r.initiatorType,
            duration: r.duration,
            encodedBodySize: r.encodedBodySize,
            decodedBodySize: r.decodedBodySize,
            transferSize: r.transferSize,
          })),
        visibleImages: [...document.images]
          .filter((i) => {
            const r = i.getBoundingClientRect();
            return (
              r.bottom > 0 &&
              r.top < innerHeight &&
              r.right > 0 &&
              r.left < innerWidth
            );
          })
          .map((i) => ({
            src: i.currentSrc,
            width: i.naturalWidth,
            height: i.naturalHeight,
            complete: i.complete,
          })),
      }));
      const visibleSources = new Set(data.visibleImages.map((i) => i.src));
      data.visibleImageEncodedBytes = data.resources
        .filter((r) => visibleSources.has(r.name))
        .reduce((n, r) => n + r.encodedBodySize, 0);
      data.initialJavaScript = htmlScriptBytes(await response.text());
      data.unexpectedSearchIndexRequests = requests.filter((url) =>
        url.includes("/search/index.json"),
      );
      data.fontRequests = data.resources.filter((r) =>
        /\.(?:woff2?|ttf)(?:\?|$)/.test(r.name),
      );
      result.pages.push({ route, ...data });
      console.log(
        JSON.stringify({
          profile: profile.name,
          route,
          lcpMs: data.metrics.lcp,
          cls: data.metrics.cls,
          initialJsBytes: data.initialJavaScript.bytes,
          imageBytes: data.visibleImageEncodedBytes,
          searchRequests: data.unexpectedSearchIndexRequests.length,
        }),
      );
      await context.close();
      fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    }
    const { context, page, requests } = await prepare(profile);
    const query = "제품사진 스튜디오";
    await page.goto(
      `${origin}${build.basePath}/ko/search/?q=${encodeURIComponent(query)}`,
      { waitUntil: "load", timeout: 120000 },
    );
    await page.waitForFunction(
      (q) =>
        document.querySelector("[data-search-status]")?.textContent.includes(q),
      query,
      { timeout: 120000 },
    );
    const cold = await page.evaluate(() =>
      window.__koPerf.worker.filter((r) => r.type === "search"),
    );
    for (let round = 0; round < 3; round++)
      for (const q of [
        "수묵화 매화",
        "네온 포트레이트",
        "제품 포스터",
        "제품사진 스튜디오",
      ]) {
        const count = await page.evaluate(() => window.__koPerf.worker.length);
        await page.locator("#search-field").fill(q);
        await page.waitForFunction(
          ({ q, count }) =>
            window.__koPerf.worker
              .slice(count)
              .some((r) => r.query === q && r.responseType === "results") &&
            document
              .querySelector("[data-search-status]")
              ?.textContent.includes(q),
          { q, count },
          { timeout: 60000 },
        );
      }
    result.search = await page.evaluate(() => ({
      worker: window.__koPerf.worker,
      renders: window.__koPerf.renders,
      resources: performance
        .getEntriesByType("resource")
        .filter((r) => r.name.includes("/search/index.json"))
        .map((r) => r.toJSON()),
    }));
    result.search.coldRequests = cold;
    result.search.indexRequestCount = requests.filter((u) =>
      u.includes("/ko/search/index.json"),
    ).length;
    const times = result.search.worker
      .filter((r) => r.type === "search")
      .slice(cold.length)
      .map((r) => r.elapsedMs)
      .sort((a, b) => a - b);
    result.search.warmSummary = {
      count: times.length,
      minMs: times[0],
      medianMs: times[Math.floor(times.length / 2)],
      maxMs: times.at(-1),
    };
    console.log(
      JSON.stringify({
        profile: profile.name,
        cold,
        warm: result.search.warmSummary,
        indexRequests: result.search.indexRequestCount,
      }),
    );
    await context.close();
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  }
} finally {
  await browser.close();
  report.completedAt = new Date().toISOString();
  report.finalLoadavg = os.loadavg();
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}
