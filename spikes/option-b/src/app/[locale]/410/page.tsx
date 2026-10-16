import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gone', robots: { index: false } };

const TEXT: Record<string, string> = { en: 'This prompt was removed', 'zh-hans': '该 Prompt 已删除' };

export default async function LocaleGone({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div data-error="410" data-error-locale={locale}>
      <h1>{TEXT[locale]}</h1>
    </div>
  );
}
