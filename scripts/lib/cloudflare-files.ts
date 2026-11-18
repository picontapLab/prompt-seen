import fs from 'node:fs';
import path from 'node:path';
import { CLOUDFLARE_REDIRECT_LIMIT, CLOUDFLARE_SHARED_RSC_KINDS } from './hosts';

const LOCALE_PAYLOAD = '__next.$d$locale.txt';

/** Only real detail URLs get an alias. Unmatched or over-budget files stay in the export. */
export function shareLocalePayloads(site: string, basePath: string, redirects: string, files: string[]) {
  const lines = fs.readFileSync(redirects, 'utf8').split('\n');
  const sources = lines.map((line) => line.trim().split(/\s+/)[0]!).filter((s) => s && !s.startsWith('#'));
  const dynamic = (source: string) => /\*|:[a-zA-Z]/.test(source.replace(/^https?:\/\//, ''));
  const dynamicCount = sources.filter(dynamic).length;
  const staticCount = sources.length - dynamicCount;
  if (staticCount > CLOUDFLARE_REDIRECT_LIMIT || dynamicCount > 100)
    throw new Error(`Cloudflare redirect limits exceeded (${staticCount} static, ${dynamicCount} dynamic)`);

  const groups = new Map<string, string[]>();
  for (const file of files.toSorted()) {
    const [locale, kind, , name, ...rest] = file.split(path.sep);
    if (rest.length || name !== LOCALE_PAYLOAD || !CLOUDFLARE_SHARED_RSC_KINDS.some((k) => k === kind)) continue;
    const group = groups.get(locale!) ?? [];
    group.push(file);
    groups.set(locale!, group);
  }

  const rules = [];
  const copies = [];
  const claimed = new Set(sources);
  const address = (file: string) => basePath + '/' + file.split(path.sep).join('/');
  for (const group of groups.values()) {
    const canonical = group.find((file) => !claimed.has(address(file)));
    if (!canonical) continue;
    const bytes = fs.readFileSync(path.join(site, canonical));
    for (const file of group) {
      if (staticCount + rules.length === CLOUDFLARE_REDIRECT_LIMIT) break;
      if (file === canonical || claimed.has(address(file))) continue;
      if (!fs.readFileSync(path.join(site, file)).equals(bytes)) continue;
      const rule = `${address(file)} ${address(canonical)} 200`;
      if (rule.length > 1000) continue;
      rules.push(rule);
      copies.push(file);
    }
  }
  if (rules.length) {
    const firstDynamic = lines.findIndex((line) => {
      const source = line.trim().split(/\s+/)[0]!;
      return source && !source.startsWith('#') && dynamic(source);
    });
    lines.splice(firstDynamic < 0 ? lines.length : firstDynamic, 0, ...rules);
    fs.writeFileSync(redirects, lines.join('\n'));
    for (const file of copies) fs.unlinkSync(path.join(site, file));
  }
  return copies.length;
}

export function reportUploadFiles(count: number) {
  const history = process.env.PAGES_COUNT_HISTORY;
  const previous = history && fs.existsSync(history) ? fs.readFileSync(history, 'utf8').trim() : '';
  const delta = /^\d+$/.test(previous) ? count - Number(previous) : null;
  const change = delta === null ? 'first measurement' : `${delta >= 0 ? '+' : ''}${delta} since previous run`;
  const message = `Cloudflare Pages: ${count}/20000 upload files, ${20000 - count} remaining (${change}).`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
  if (count >= 18000 && process.env.GITHUB_ACTIONS) console.log('::warning::' + message);
  if (count > 20000) throw new Error(message);
  if (history) fs.writeFileSync(history, String(count));
}
