/** Pure production classification and browse selection (general-localization-spec §4). */
export type LocalStatus = 'current' | 'missing' | 'draft' | 'unreviewed' | 'outdated' | 'archived' | 'invalid';
export type TextReview = 'current' | 'unreviewed' | 'outdated';

export type ReviewRecord = {
  key: string;
  sourceHash: string;
  targetHash: string;
  completedAt: string;
  conclusion: 'approved' | 'changes-requested';
};

export function reviewState(key: string, sourceHash: string, targetHash: string | null, records: readonly ReviewRecord[], now = Date.now()): TextReview {
  const latest = records.filter((record) => record.key === key).sort((a, b) =>
    Date.parse(b.completedAt) - Date.parse(a.completedAt) ||
    (a.conclusion === 'changes-requested' ? -1 : b.conclusion === 'changes-requested' ? 1 : 0),
  )[0];
  if (!targetHash || !latest || latest.conclusion !== 'approved' || latest.targetHash !== targetHash || Date.parse(latest.completedAt) > now) return 'unreviewed';
  return latest.sourceHash === sourceHash ? 'current' : 'outdated';
}

export function classifyLocalization(input: {
  declaredStatus: string | null;
  publishable: boolean;
  review: TextReview;
  dependencies: TextReview[];
}): LocalStatus {
  if (input.declaredStatus === 'archived') return 'archived';
  if (input.declaredStatus === null) return 'missing';
  if (input.declaredStatus === 'draft') return 'draft';
  if (!input.publishable || input.review === 'unreviewed' || input.dependencies.includes('unreviewed')) return 'unreviewed';
  if (input.review === 'outdated' || input.dependencies.includes('outdated')) return 'outdated';
  return 'current';
}

export function selectDescription(input: {
  locale: string;
  defaultLocale: string;
  sourceLocale: string | null;
  registry: string[];
  preview: boolean;
  standalone?: boolean;
  versions: ReadonlyMap<string, { status: LocalStatus; published: boolean }>;
}): { contentLocale: string; localStatus: Exclude<LocalStatus, 'archived' | 'invalid'>; presentation: 'local' | 'fallback' | 'draft' } | null {
  const local = input.versions.get(input.locale);
  const localStatus = local?.status ?? 'missing';
  if (localStatus === 'archived' || localStatus === 'invalid') return null;
  if (local && (localStatus === 'current' || localStatus === 'outdated'))
    return { contentLocale: input.locale, localStatus, presentation: 'local' };
  if (input.preview && local && localStatus !== 'missing')
    return { contentLocale: input.locale, localStatus, presentation: 'draft' };
  if (input.standalone) return null;
  for (const code of new Set([input.defaultLocale, input.sourceLocale, ...input.registry])) {
    if (!code) continue;
    const version = input.versions.get(code);
    if (version?.published && (version.status === 'current' || version.status === 'outdated'))
      return { contentLocale: code, localStatus, presentation: 'fallback' };
  }
  return null;
}
