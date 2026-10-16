import type { Metadata } from 'next';
import Link from 'next/link';
import { PromptDetailBody } from '@/components/PromptDetailBody';
import { getDetail, slugParams } from '@/lib/content';
import { LOCALES, absUrl, detailPath, listPath, markdownPath } from '@/lib/site.mjs';

export const dynamicParams = false;
export function generateStaticParams() {
  return slugParams();
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = getDetail(locale, slug);
  return {
    title: d.title,
    description: d.summary,
    alternates: {
      canonical: detailPath(locale, slug),
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l.htmlLang, detailPath(l.prefix, slug)])),
        'x-default': '/',
      },
      types: { 'text/markdown': markdownPath(locale, slug) },
    },
    openGraph: {
      url: detailPath(locale, slug),
      title: d.title,
      // Effect images live on the CDN with absolute URLs (memo §1).
      images: [{ url: `https://cdn.example.com/og/${slug}.jpg`, width: 1200, height: 630 }],
    },
  };
}

export default async function PromptPage({ params }: Props) {
  const { locale, slug } = await params;
  const d = getDetail(locale, slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: d.title,
    url: absUrl(detailPath(locale, slug)),
    encoding: { '@type': 'MediaObject', contentUrl: absUrl(markdownPath(locale, slug)), encodingFormat: 'text/markdown' },
  };
  return (
    <div data-page="detail">
      <p>
        <Link href={listPath(locale)} data-testid="back-to-list">
          ← All prompts
        </Link>
      </p>
      <PromptDetailBody detail={d} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
