import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
const [baseline, current, output = "/tmp/ko-first-load-comparison.json"] =
  process.argv.slice(2);
if (!baseline || !current)
  throw new Error(
    "Usage: node ko-first-load-compare.mjs BASELINE_WORKTREE CURRENT_WORKTREE [OUTPUT]",
  );
const roots = { baseline, current };
const report = {
  method:
    "HTML-referenced scripts only; deduplicated URLs; actual local dist bodies compressed using node gzip level 6. Excludes idle/preload/prefetch scripts, matching design §16.1.",
  builds: {},
};
for (const [label, root] of Object.entries(roots)) {
  const dist = path.join(root, "dist");
  const build = JSON.parse(
    fs.readFileSync(
      path.join(dist, "prompt-seen/generated/build.json"),
      "utf8",
    ),
  );
  const routes =
    label === "baseline"
      ? ["/", "/en/prompts/", "/en/prompts/design-top60-01/"]
      : [
          "/",
          "/en/prompts/",
          "/en/prompts/design-top60-01/",
          "/ko/",
          "/ko/prompts/",
          "/ko/prompts/design-top60-01/",
        ];
  const results = [];
  for (const route of routes) {
    const file = path.join(dist, build.basePath, route, "index.html");
    const html = fs.readFileSync(file, "utf8");
    const refs = [
      ...new Set(
        [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]),
      ),
    ];
    const scripts = refs.map((url) => {
      const body = fs.readFileSync(
        path.join(dist, new URL(url, "http://localhost").pathname),
      );
      return {
        url,
        rawBytes: body.length,
        gzipBytes: gzipSync(body, { level: 6 }).length,
      };
    });
    results.push({
      route,
      gzipBytes: scripts.reduce((n, s) => n + s.gzipBytes, 0),
      scripts,
    });
  }
  report.builds[label] = {
    buildId: build.buildId,
    basePath: build.basePath,
    pages: results,
  };
}
report.comparison = report.builds.baseline.pages.map((before, i) => {
  const currentEn = report.builds.current.pages[i];
  const currentKo = report.builds.current.pages[i + 3];
  return {
    baselineEnRoute: before.route,
    currentKoRoute: currentKo.route,
    baselineEnBytes: before.gzipBytes,
    currentEnBytes: currentEn.gzipBytes,
    currentKoBytes: currentKo.gzipBytes,
    englishDeltaBytes: currentEn.gzipBytes - before.gzipBytes,
    koreanOverCurrentEnglishBytes: currentKo.gzipBytes - currentEn.gzipBytes,
    koreanOverBaselineEnglishBytes: currentKo.gzipBytes - before.gzipBytes,
  };
});
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.comparison, null, 2));
