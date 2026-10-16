import Link from 'next/link';
import { localeParams } from '@/lib/content';
import { LOCALES } from '@/lib/site.mjs';

export const dynamicParams = false;
export function generateStaticParams() {
  return localeParams();
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <nav className="site" aria-label="Site">
        <Link href="/">Prompt Seen</Link>
        <Link href={`/${locale}/prompts/`} data-testid="nav-prompts">
          Prompts
        </Link>
        <Link href={`/${locale}/templates/`} data-testid="nav-templates">
          Templates
        </Link>
        {LOCALES.filter((l) => l.prefix !== locale).map((l) => (
          <Link key={l.prefix} href={`/${l.prefix}/prompts/`} hrefLang={l.htmlLang}>
            {l.name}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </>
  );
}
