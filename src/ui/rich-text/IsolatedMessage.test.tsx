import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { catalogTranslator } from '@/i18n/translator';
import { IsolatedMessage } from './IsolatedMessage';

it('isolates a query in the actual Arabic message without changing or interpreting its text', () => {
  const t = catalogTranslator(process.cwd(), 'ar');
  const html = renderToStaticMarkup(
    <IsolatedMessage format={(query) => t('search.noResults.title', { query })} value={'GPT <image> ٢'} />,
  );
  expect(html).toBe('لا نتائج لـ«<bdi dir="auto">GPT &lt;image&gt; ٢</bdi>»');
});
