// Which works on show have started, and in what order (design doc §11.8.1). No imports, so the
// site, its tests and the end-to-end tests share the one rule.

export type HomeSettings = { featured: readonly { prompt: string; from?: string }[] };

/**
 * The works on show that have started on `today`, in the order they are shown: dated entries,
 * latest date first, then undated ones; ties keep the order of site.yaml. A scheduled entry waits
 * for its date; a work listed twice counts once.
 */
export function featuredOrder(featured: HomeSettings['featured'], today: string): string[] {
  const order = featured
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => !f.from || f.from <= today)
    .sort((a, b) => (b.f.from ?? '').localeCompare(a.f.from ?? '') || a.i - b.i)
    .map(({ f }) => f.prompt);
  return [...new Set(order)];
}
