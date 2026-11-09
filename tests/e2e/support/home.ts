import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { ROOT } from './artifact';
import { feedIndex, localeIndex, promptDetail } from './content';

/** Independent acceptance oracle. Unit cases S01–S08 also assert literal expected IDs. */
export function worksOnShow(code: string): string[] {
  const config = parse(fs.readFileSync(path.join(ROOT, 'content/site.yaml'), 'utf8')).home.featured as {
    prompt: string;
    from?: string;
  }[];
  const today = new Date().toISOString().slice(0, 10);
  const started = config
    .filter((x) => !x.from || x.from <= today)
    .sort((a, b) => (b.from ?? '').localeCompare(a.from ?? ''));
  const active = [...new Set(started.map((x) => x.prompt))];
  const future = config.filter((x) => !active.includes(x.prompt)).map((x) => x.prompt);
  const usable = localeIndex(code)
    .prompts.filter((p) => !future.includes(p.id))
    .map((p) => promptDetail(code, p.id))
    .filter((d) => d.locale === code && d.prompt.text.trim() && d.cover.width > 0);
  const configured = active.flatMap((id) => usable.filter((d) => d.id === id && d.annotations.length));
  const matching = configured.filter((d) => d.prompt.language === code);
  if (matching.length) return [...matching, ...configured.filter((d) => d.prompt.language !== code)].map((d) => d.id);
  const fallback = feedIndex(code).featured.flatMap((id) =>
    usable.filter((d) => d.id === id && d.annotations.length && !active.includes(id)),
  );
  const local = fallback.find((d) => d.prompt.language === code);
  if (local) return [local.id, ...configured.map((d) => d.id)];
  if (configured.length) return configured.map((d) => d.id);
  if (fallback.length) return [fallback[0]!.id];
  const last = usable.find((d) => d.prompt.language === code) ?? usable[0];
  return last ? [last.id] : [];
}
