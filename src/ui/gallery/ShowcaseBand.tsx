import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { promptJsonFile } from '@/modules/feed/files';
import type { FeedBand } from '@/modules/feed/types';
import { paths, withBasePath } from '@/modules/url';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { FeatureShowcase } from '@/ui/showcase/FeatureShowcase';
import styles from './ShowcaseBand.module.css';
import { Card } from './Card';
import gallery from './Gallery.module.css';

/**
 * The list's first-screen showcase band (design doc §11.8.2 首屏展示带): this week's lead work
 * large with its annotated quote, and up to two more at medium size, all at their original
 * ratio. The lead image is the page's main image (LCP), loaded first. It folds away while
 * filters apply (HideWhenFiltered).
 */
export function ShowcaseBand({ band, locale }: { band: FeedBand; locale: string }) {
  const t = useTranslations('feed');
  const d = useTranslations('detail');
  const lead = band.lead;
  return (
    <section className={styles.band} aria-labelledby="showcase-label" data-band="">
      <h2 id="showcase-label" className={gallery.eyebrow}>
        {t('band.label')}
      </h2>
      <div className={styles.layout} data-works={band.works.length}>
        <div className={styles.lead}>
          <FeatureShowcase
            showcase={lead}
            size="row"
            priority
            headingLevel="h3"
            sizes="(min-width: 1024px) 44vw, 100vw"
            actions={
              <>
                <CopyButton
                  text={lead.prompt}
                  labels={{
                    copy: d('copy.label'),
                    done: d('copy.done'),
                    failed: d('copy.failed'),
                    failedHint: d('copy.failedHint'),
                  }}
                />
                <a
                  href={withBasePath(lead.path)}
                  className={gallery.more}
                  data-prefetch={withBasePath(paths.generated(promptJsonFile(locale, band.leadSlug)))}
                >
                  {t('interlude.open')}
                  <ArrowRight aria-hidden="true" className={gallery.arrow} />
                </a>
              </>
            }
          />
        </div>
        {band.works.length > 0 && (
          <div className={styles.works}>
            {band.works.map((card) => (
              <Card
                key={card.id}
                card={card}
                locale={locale}
                className={styles.work}
                sizes="(min-width: 1024px) 22vw, 50vw"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
