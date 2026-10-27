import type { ImageRef, ImageVariant, ImageVariantName } from '@/modules/content/types';
import { absoluteMediaUrl, mediaUrl } from '@/modules/url';

// Image addresses and responsive attributes (design doc §7, §10.2, §10.3). Works on the server
// and in the browser. Images come from the CDN when site.yaml `media.baseUrl` (or MEDIA_BASE_URL)
// is set, otherwise from the local media driver's files under public/ (§10.1).

/** Responsive variants from small to large; `og` is a crop and `original` is not re-encoded. */
const LADDER: ImageVariantName[] = ['thumbnail', 'card', 'detail'];

/** What image helpers read from an image: full ImageRefs and the slim card images of lists both fit. */
export type ImageSource = Pick<ImageRef, 'variants' | 'width' | 'height' | 'alt' | 'placeholder'>;

/** Address for `<img src>` and fetches. */
export const imageUrl = (variant: ImageVariant) => mediaUrl(variant.key);

/** Address on the canonical host, for Open Graph, sitemaps and structured data. */
export const absoluteImageUrl = (variant: ImageVariant) => absoluteMediaUrl(variant.key);

/** `srcset` with every ladder variant up to `largest`, one per distinct width. */
export function srcSet(image: Pick<ImageRef, 'variants'>, largest: ImageVariantName = 'detail'): string {
  const top = LADDER.indexOf(largest);
  const seen = new Set<number>();
  return LADDER.slice(0, top < 0 ? LADDER.length : top + 1)
    .map((name) => image.variants[name])
    .filter((v): v is ImageVariant => !!v && !seen.has(v.width) && (seen.add(v.width), true))
    .map((v) => `${imageUrl(v)} ${v.width}w`)
    .join(', ');
}

export type ImageProps = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  /** Frame colour before the image loads (§11.9). */
  placeholder: string;
};

/**
 * Everything an `<img>` needs for one use (§10.3): the preset's variant as `src`, smaller ones
 * in `srcset`, and the original's width and height so the browser reserves the space.
 */
export function getImage(image: ImageSource, preset: Exclude<ImageVariantName, 'og'> = 'card'): ImageProps {
  const variant =
    image.variants[preset] ??
    image.variants.detail ??
    image.variants.card ??
    image.variants.thumbnail ??
    image.variants.original!;
  return {
    src: imageUrl(variant),
    srcSet: preset === 'original' ? '' : srcSet(image, preset),
    width: image.width,
    height: image.height,
    alt: image.alt,
    placeholder: image.placeholder,
  };
}
