import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { localeByPrefix, type LocaleEntry } from '@/config';

/**
 * Call first in every layout and page under [locale], with the `locale` route param.
 *
 * Layouts and pages render independently under static rendering, so a locale set in the
 * layout does not reach the page: each one sets it itself, or next-intl falls back to the
 * default locale and the page silently renders English (next-intl static rendering guide).
 * Components and generateMetadata pass `locale: entry.code` to getTranslations explicitly.
 */
export function enterLocale(prefix: string): LocaleEntry {
  const entry = localeByPrefix(prefix);
  if (!entry) notFound();
  setRequestLocale(entry.code);
  return entry;
}
