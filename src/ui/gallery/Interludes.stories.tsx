import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { jazzShowcase } from '@/ui/showcase/fixtures';
import { slimImage } from '@/modules/feed/compose';
import { FeatureRow, TemplateStrip } from './Interludes';

// Editorial interludes between justified rows (§11.8.2 编辑节奏). Collection banners appear once
// step 3e adds collection pages.

const meta = { title: 'Gallery/Interludes', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A feature row: one work large at its original ratio, its quote and annotations. */
export const Feature: Story = {
  render: () => (
    <FeatureRow
      locale="en"
      block={{
        t: 'feature',
        key: 'editorial-0-p_045',
        reason: 'editorial',
        showcase: jazzShowcase,
        card: {
          id: 'p_045',
          slug: 'jazz-club-poster',
          path: jazzShowcase.path,
          title: jazzShowcase.title,
          localization: { contentLocale: 'en', localStatus: 'current', presentation: 'local', indexable: true },
          frameNumber: '0045',
          cover: slimImage(jazzShowcase.cover),
          ratio: '3:4',
          model: null,
          verification: 'unknown',
          lastTestedAt: null,
          promptLanguage: 'en',
          locale: 'en',
          description: '',
        },
      }}
    />
  ),
};

/** A template strip: openings with their variables in the field colours (§11.1.1). */
export const Templates: Story = {
  render: () => (
    <TemplateStrip
      locale="en"
      block={{
        t: 'templates',
        key: 'templates-1',
        items: [
          {
            id: 't_001',
            path: '/en/templates/product-poster/',
            title: 'Product poster',
            localization: { contentLocale: 'en', localStatus: 'current', presentation: 'local', indexable: true },
            locale: 'en',
            description: 'Customize the subject and palette for your image.',
            fieldCount: 4,
            promptLanguage: 'en',
            excerpt: [
              'Create an editorial product poster for ',
              { v: 'product', c: 1 },
              '. Key selling points: ',
              { v: 'sellingPoints', c: 2 },
              '. Palette: ',
              { v: 'palette', c: 3 },
            ],
          },
          {
            id: 't_002',
            path: '/en/templates/ink-scroll/',
            title: 'Ink scroll',
            localization: { contentLocale: 'en', localStatus: 'current', presentation: 'local', indexable: true },
            locale: 'en',
            description: 'Customize the subject and palette for your image.',
            fieldCount: 3,
            promptLanguage: 'en',
            excerpt: [
              'A hanging scroll of ',
              { v: 'subject', c: 1 },
              ' in ',
              { v: 'inkTone', c: 2 },
              ' ink, with ',
              { v: 'seal', c: 3 },
            ],
          },
        ],
      }}
    />
  ),
};
