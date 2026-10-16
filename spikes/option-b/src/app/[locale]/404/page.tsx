import type { Metadata } from 'next';

// Rendered at /{locale}/404/; nginx serves it via `error_page 404` and marks the
// location internal so the page itself never answers 200.
export const metadata: Metadata = { title: 'Not found', robots: { index: false } };

const TEXT: Record<string, string> = { en: 'Page not found', 'zh-hans': '页面不存在' };

export default async function LocaleNotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div data-error="404" data-error-locale={locale}>
      <h1>{TEXT[locale]}</h1>
    </div>
  );
}
