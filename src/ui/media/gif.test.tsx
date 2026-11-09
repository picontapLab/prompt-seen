import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { compileMessages } from '@/i18n/catalog';
import primitives from '@/i18n/messages/en/primitives.json';
import detail from '@/i18n/messages/en/detail.json';
import feed from '@/i18n/messages/en/feed.json';
import favorites from '@/i18n/messages/en/favorites.json';
import { slimImage } from '@/modules/feed/compose';
import { Card } from '@/ui/gallery/Card';
import { ImageStage } from '@/ui/prompt-detail/ImageStage';
import { jazzCover } from '@/ui/showcase/fixtures';

const messages = compileMessages({ primitives, detail, feed, favorites });
const cover = {
  ...jazzCover,
  mimeType: 'image/gif',
  animation: { frameCount: 2, durationMs: 360, loopCount: 0 },
};

it('renders animated responsive images and GIF badges in initial HTML without playback controls', () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      <Card
        locale="en"
        actions={null}
        card={{
          id: 'p_001',
          slug: 'gif',
          path: '/en/prompts/gif/',
          title: 'Animated example',
          frameNumber: '0001',
          cover: slimImage(cover),
          ratio: '3:4',
          model: 'Test',
          verification: 'verified',
          lastTestedAt: null,
          promptLanguage: 'en',
          locale: 'en',
          description: 'Animate this.',
          hasGifOutput: true,
        }}
      />
      <ImageStage images={[cover]} sizes="100vw" />
    </NextIntlClientProvider>,
  );
  expect(html.match(/data-media-badge="gif"/g)).toHaveLength(2);
  expect(html).toContain('srcSet=');
  expect(html).toContain(cover.variants.detail!.key);
  expect(html).not.toContain('<button');
});

it('marks GIF outputs even when the cover is a static image', () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      <Card
        locale="en"
        actions={null}
        card={{
          id: 'p_001',
          slug: 'gif',
          path: '/en/prompts/gif/',
          title: 'Mixed outputs',
          frameNumber: '0001',
          cover: slimImage(jazzCover),
          ratio: '3:4',
          model: null,
          verification: 'unknown',
          lastTestedAt: null,
          promptLanguage: 'en',
          locale: 'en',
          description: 'Animate this.',
          hasGifOutput: true,
        }}
      />
    </NextIntlClientProvider>,
  );
  expect(html).toContain('Includes GIF');
});
