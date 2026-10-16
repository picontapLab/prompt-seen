import type { Metadata } from 'next';
import { Gallery } from '@/components/Gallery';
import { getCards, getLocale } from '@/lib/content';
import { LOCALES, listPath } from '@/lib/site.mjs';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Prompts',
    alternates: {
      canonical: listPath(locale),
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l.htmlLang, listPath(l.prefix)])),
        'x-default': '/',
      },
    },
    openGraph: { url: listPath(locale), title: 'Prompts' },
  };
}

export default async function PromptsPage({ params }: Props) {
  const { locale } = await params;
  getLocale(locale);
  return (
    <>
      <h1>Prompts</h1>
      <Gallery prefix={locale} cards={getCards(locale)} />
    </>
  );
}
