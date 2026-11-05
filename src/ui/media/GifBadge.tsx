import { useTranslations } from 'next-intl';
import type { ImageRef } from '@/modules/content/types';
import styles from './GifBadge.module.css';

/** The format belongs to the original, even when the browser displays an animated WebP. */
export function GifBadge({
  image,
  hasGifOutput,
  overlay = false,
}: {
  image?: Pick<ImageRef, 'mimeType'> | null;
  hasGifOutput?: boolean;
  overlay?: boolean;
}) {
  const t = useTranslations('primitives.media');
  const gif = image?.mimeType === 'image/gif';
  if (!gif && !hasGifOutput) return null;
  return (
    <span className={styles.badge} data-overlay={overlay || undefined} data-media-badge="gif">
      {gif ? 'GIF' : t('gifExample')}
    </span>
  );
}
