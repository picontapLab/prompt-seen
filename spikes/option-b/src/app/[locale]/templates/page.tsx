import type { Metadata } from 'next';
import Link from 'next/link';
import { absUrl } from '@/lib/site.mjs';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: 'Templates', alternates: { canonical: absUrl(`/${locale}/templates/`) } };
}

export default async function TemplatesPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div data-page="templates">
      <h1>Templates</h1>
      <p>
        <Link href={`/${locale}/prompts/`}>Back to prompts</Link>
      </p>
    </div>
  );
}
