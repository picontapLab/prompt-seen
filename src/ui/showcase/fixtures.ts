import type { ImageRef } from '@/modules/content/types';
import type { Showcase } from './model';

// Story sample: prompt p_045 of the sample content (§17.6), copied from its built detail model.
// Image keys point into public/media/, which Storybook serves under the base path. If the image
// is imported again its keys change; copy them from .generated/content/en/prompt/p_045.json.

const variant = (key: string, width: number, height: number, mimeType = 'image/webp') => ({
  key: `media/a_045/jazz-club-poster-${key}`,
  width,
  height,
  mimeType,
});

export const jazzCover: ImageRef = {
  assetId: 'a_045',
  width: 900,
  height: 1200,
  ratio: 0.75,
  extreme: false,
  placeholder: '#182848',
  alt: 'Navy poster with a mustard disc, a teal arc, a red half circle, a grey dot grid and two cream bars.',
  caption: null,
  variants: {
    thumbnail: variant('thumbnail-75d13377f6cf.webp', 360, 480),
    card: variant('card-129d7d8b9efc.webp', 720, 960),
    detail: variant('detail-8e96bcb79866.webp', 900, 1200),
    original: variant('original-49400cd44477.jpg', 900, 1200, 'image/jpeg'),
  },
  credit: {
    creator: 'Prompt Seen sample set',
    creditText: 'Prompt Seen',
    copyrightNotice: 'Sample image for Prompt Seen, CC BY 4.0',
    sourceUrl: null,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    acquireLicenseUrl: null,
  },
  digitalSourceType: 'algorithmicMedia',
};

const prompt =
  'Bauhaus-style jazz club poster on a deep navy background: a large mustard sun disc in the upper right, a thin teal arc sweeping behind it, a red half circle resting on the left, a grid of small grey dots in the lower right, two cream title bars at the bottom left, flat colours with fine paper grain, 3:4 aspect ratio.';

export const jazzShowcase: Showcase = {
  localization: { contentLocale: 'en', localStatus: 'current', presentation: 'local', indexable: true },
  id: 'p_045',
  path: '/en/prompts/jazz-club-poster/',
  title: 'Jazz club poster',
  frameNumber: '0045',
  cover: jazzCover,
  model: 'Sample Renderer 1',
  lastTestedAt: '2026-08-18',
  promptLanguage: 'en',
  quote: prompt,
  truncated: false,
  prompt,
  annotations: [
    {
      letter: 'A',
      phrase: 'a large mustard sun disc',
      start: 58,
      end: 82,
      region: { x: 0.32, y: 0.065, w: 0.68, h: 0.51 },
      note: 'The largest shape anchors the upper right and sets the warm accent.',
    },
    {
      letter: 'B',
      phrase: 'a thin teal arc',
      start: 103,
      end: 118,
      region: { x: 0.23, y: 0, w: 0.5, h: 0.47 },
      note: '“Thin” keeps the arc a line, so it adds motion without a second heavy shape.',
    },
    {
      letter: 'C',
      phrase: 'a red half circle',
      start: 139,
      end: 156,
      region: { x: 0.1, y: 0.45, w: 0.4, h: 0.15 },
      note: 'A half circle on the left balances the disc on the right.',
    },
    {
      letter: 'D',
      phrase: 'a grid of small grey dots',
      start: 178,
      end: 203,
      region: { x: 0.615, y: 0.635, w: 0.255, h: 0.11 },
      note: 'A quiet texture that fills the lower right without competing.',
    },
    {
      letter: 'E',
      phrase: 'two cream title bars',
      start: 224,
      end: 244,
      region: { x: 0.08, y: 0.74, w: 0.62, h: 0.12 },
      note: 'Bars reserve space for the event name; asking for real text often comes out garbled.',
    },
  ],
};
