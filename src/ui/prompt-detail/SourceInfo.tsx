import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ImageRef, SourceInfo as Source } from '@/modules/content/types';
import styles from './Detail.module.css';

function External({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} className={styles.external}>
      {children}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

/**
 * Source and licence (design doc §9.2 item 8, §9.8, §9.10.5): who wrote the prompt and under
 * which licence, or "Source unknown"; the image's creator, credit line, licence and how it was
 * made. Unknown fields are left out rather than filled with placeholders (§9.6).
 */
export function SourceInfo({ source, image }: { source: Source; image: ImageRef }) {
  const t = useTranslations('detail.source');
  const id = useId();
  const { credit } = image;
  const known = source.author || source.url || source.license;
  const made =
    image.digitalSourceType === 'trainedAlgorithmicMedia'
      ? t('aiGenerated')
      : image.digitalSourceType === 'algorithmicMedia'
        ? t('algorithmic')
        : null;

  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionHeading}>
        {t('heading')}
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>{t('prompt')}</dt>
          <dd>
            {known ? (
              <>
                {source.author && <External href={source.url}>{t('author', { author: source.author })}</External>}
                {!source.author && source.url && <External href={source.url}>{source.url}</External>}
                {source.license && <span>{t('licence', { licence: source.license })}</span>}
              </>
            ) : (
              t('unknown')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('image')}</dt>
          <dd>
            {credit.creator && <span>{t('creator', { creator: credit.creator })}</span>}
            {credit.copyrightNotice && <span>{credit.copyrightNotice}</span>}
            {credit.license && (
              <External href={credit.licenseUrl}>{t('licence', { licence: credit.license })}</External>
            )}
            {made && <span>{made}</span>}
            {!credit.creator && !credit.license && !credit.copyrightNotice && <span>{t('unknown')}</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}
