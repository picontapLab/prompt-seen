import { useTranslations } from 'next-intl';
import type { ImageRef } from '@/modules/content/types';
import { IsolatedMessage } from '@/ui/rich-text/IsolatedMessage';
import styles from './GifBadge.module.css';

/**
 * Class for an element that holds badges over a picture and can be too narrow for a whole label,
 * such as the frame of a small card: inside it, a badge shows the format alone ("GIF") while the
 * element is narrower than the label needs. The whole label stays for assistive technology.
 */
export const gifBadgeHost = styles.host!;

/** The format belongs to the original, even when the browser displays an animated WebP. */
export function GifBadge({
  image,
  hasGifOutput,
  overlay = false,
}: {
  image?: Pick<ImageRef, 'mimeType' | 'generationModel'> | null;
  hasGifOutput?: boolean;
  overlay?: boolean;
}) {
  const t = useTranslations('primitives.media');
  const gif = image?.mimeType === 'image/gif';
  if (!gif && !hasGifOutput) return null;
  const label =
    gif && image.generationModel ? (
      <IsolatedMessage format={(model) => t('gifGenerated', { model })} value={image.generationModel} dir="ltr" />
    ) : gif ? null : (
      t('gifExample')
    );
  return (
    <span className={styles.badge} data-overlay={overlay || undefined} data-media-badge="gif">
      {label ? (
        <>
          <span className={styles.full}>{label}</span>
          <span className={styles.short} aria-hidden="true">
            GIF
          </span>
        </>
      ) : (
        'GIF'
      )}
    </span>
  );
}
