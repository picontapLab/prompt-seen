import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { localeByPrefix } from '@/config';
import { paths } from '@/modules/url';

// Minimal error page body shared by /{locale}/404/ and /{locale}/410/. Step 3e adds search,
// use-case entries and recent works (§11.8.7).
export async function ErrorPage({ locale, kind }: { locale: string; kind: 'notFound' | 'gone' }) {
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations('common.errors');
  return (
    <main data-error={kind === 'notFound' ? '404' : '410'} data-locale={entry.code}>
      <h1>{t(`${kind}.title`)}</h1>
      <p>{t(`${kind}.body`)}</p>
      <p>
        <Link href={paths.home(locale)}>{t('home', { language: entry.nativeName })}</Link>
      </p>
    </main>
  );
}
