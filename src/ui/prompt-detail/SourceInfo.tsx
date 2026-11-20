import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ImageRef, SourceInfo as Source } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import { licenseUrl } from '@/modules/seo/structured-data';
import { paths } from '@/modules/url';
import { languageAttributes } from './language';
import styles from './Detail.module.css';

function External({ href, children, target }: { href: string | null; children: React.ReactNode; target?: '_blank' }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} className={styles.external} target={target} rel={target && 'noopener'}>
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
export function SourceInfo({
  source,
  image,
  images,
  references,
  localePrefix,
}: {
  source?: Source;
  image: ImageRef | null;
  images?: readonly ImageRef[];
  references?: readonly ImageRef[];
  localePrefix: string;
}) {
  const t = useTranslations('detail.source');
  const id = useId();
  const assets = [...(references ?? []), ...(images?.length ? images : image ? [image] : [])];

  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionHeading}>
        {t('heading')}
      </h2>
      <p>
        <Link href={paths.page(localePrefix, 'license')} prefetch={false}>
          {t('siteTextLicense')}
        </Link>
        {' · '}
        <Link href={`${paths.page(localePrefix, 'about')}#testing-method`} prefetch={false}>
          {t('testingMethod')}
        </Link>
      </p>
      <dl className={styles.facts}>
        {source && (
          <div>
            <dt>{t('prompt')}</dt>
            <dd>
              {source.author || source.url || source.license ? (
                <>
                  {source.author && <External href={source.url}>{t('author', { author: source.author })}</External>}
                  {!source.author && source.url && <External href={source.url}>{source.url}</External>}
                  {source.license && (
                    <External href={licenseUrl(source.license)}>{t('licence', { licence: source.license })}</External>
                  )}
                </>
              ) : (
                t('unknown')
              )}
            </dd>
          </div>
        )}
        {[...new Map(assets.map((asset) => [asset.assetId, asset])).values()].map((asset) => {
          const { credit } = asset;
          const licence = credit.license ?? credit.licenseUrl;
          const made =
            asset.digitalSourceType === 'trainedAlgorithmicMedia'
              ? t('aiGenerated')
              : asset.digitalSourceType === 'algorithmicMedia'
                ? t('algorithmic')
                : null;
          return (
            <div key={asset.assetId}>
              <dt>
                <External href={getImage(asset, 'original').src} target="_blank">
                  <span {...languageAttributes(asset.altLocale)}>{asset.alt || t('image')}</span>
                </External>
              </dt>
              <dd>
                {credit.creator && <span>{t('creator', { creator: credit.creator })}</span>}
                {credit.creditText && <span>{credit.creditText}</span>}
                {credit.copyrightNotice && <span>{credit.copyrightNotice}</span>}
                {licence && (
                  <External href={credit.licenseUrl ?? licenseUrl(credit.license)}>
                    {t('licence', { licence })}
                  </External>
                )}
                {credit.sourceUrl && <External href={credit.sourceUrl}>{t('imageSource')}</External>}
                {made && <span>{made}</span>}
                {!credit.creator && !credit.creditText && !licence && !credit.copyrightNotice && !credit.sourceUrl && (
                  <span>{t('unknown')}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
