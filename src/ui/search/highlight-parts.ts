import { isCjkTerm, spans } from '@/modules/search/tokenize';

type Range = { start: number; end: number };

/**
 * Parts of a text with the words a result matched marked (§11.8.6): runs of plain text and of
 * matched text. Uses the search tokeniser, so marks fall on whole words. CJK queries match by
 * character pairs; marking every pair would also mark ター inside ベクター for "ポスター", so a
 * whole query run is marked where it occurs, and its pairs only where it does not.
 */
export function highlightParts(
  text: string,
  locale: string,
  terms: readonly string[],
): { text: string; mark: boolean }[] {
  if (!terms.length || !text) return [{ text, mark: false }];
  const all = spans(text, locale, 'index');
  const ranges: Range[] = [];

  const words = new Set(terms.filter((t) => !isCjkTerm(t)));
  for (const s of all) if (words.has(s.term)) ranges.push(s);

  // Single CJK characters in order, to find runs of the query in the text.
  const chars = all.filter((s) => isCjkTerm(s.term) && [...s.term].length === 1);
  const cjk = terms.filter(isCjkTerm);
  const runs = cjk.filter((t) => [...t].length > 2);
  const found: string[] = [];
  for (const run of runs) {
    const want = [...run];
    for (let i = 0; i + want.length <= chars.length; i++) {
      let ok = true;
      for (let k = 0; k < want.length && ok; k++)
        ok = chars[i + k]!.term === want[k] && (k === 0 || chars[i + k]!.start === chars[i + k - 1]!.end);
      if (ok) ranges.push({ start: chars[i]!.start, end: chars[i + want.length - 1]!.end });
      if (ok && !found.includes(run)) found.push(run);
    }
  }
  for (const pair of cjk.filter((t) => [...t].length <= 2)) {
    if (found.some((run) => run.includes(pair))) continue;
    for (const s of all) if (s.term === pair) ranges.push(s);
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ start: r.start, end: r.end });
  }
  const parts: { text: string; mark: boolean }[] = [];
  let at = 0;
  for (const r of merged) {
    if (r.start > at) parts.push({ text: text.slice(at, r.start), mark: false });
    parts.push({ text: text.slice(r.start, r.end), mark: true });
    at = r.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), mark: false });
  return parts;
}
