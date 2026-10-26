'use client';

import { ArrowRight, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { promptJsonFile } from '@/modules/feed/files';
import type { OnShow } from '@/modules/home/compose';
import { paths, withBasePath } from '@/modules/url';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { Button } from '@/ui/primitives/Button';
import { FeatureShowcase } from '@/ui/showcase/FeatureShowcase';
import styles from './Home.module.css';

/**
 * The home first screen (design doc §11.8.1): one work on show, large at its original ratio on
 * film, its label, the opening of its prompt with lettered phrases, "Copy prompt" and the way to
 * its page. "Another frame" steps through the works on show in the order of site.yaml; the first
 * one is the build's, so the first output is the same for every visitor, and nothing rotates by
 * itself. The page's title and the search field (`footer`) sit in the text column.
 */
export function HomeHero({
  works,
  locale,
  siteName,
  footer,
}: {
  works: readonly OnShow[];
  /** Registry code, for the popup data the open link prefetches. */
  locale: string;
  siteName: string;
  footer?: ReactNode;
}) {
  const t = useTranslations('home.hero');
  const d = useTranslations('detail');
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const section = useRef<HTMLElement>(null);
  const switched = useRef(false);
  const s = works[index] ?? works[0]!;

  // The showcase is rebuilt for the next work (its annotations start afresh); keep the visitor
  // on "Another frame" so pressing again keeps stepping.
  useEffect(() => {
    if (!switched.current) return;
    switched.current = false;
    section.current?.querySelector<HTMLElement>('[data-another]')?.focus();
  }, [index]);

  const next = () => {
    const i = (index + 1) % works.length;
    const w = works[i]!;
    switched.current = true;
    setIndex(i);
    setAnnouncement(t('showing', { frame: w.frameNumber, title: w.title }));
  };

  return (
    <section ref={section} className={styles.hero} aria-labelledby="home-title" data-on-show={s.id}>
      <FeatureShowcase
        key={s.id}
        showcase={s}
        size="hero"
        // Always on the first screen: loaded at once, never lazily, whichever work is on show.
        priority
        develop
        film={{ startPrint: `${s.frameNumber} ▸ ${s.frameNumber}A`, endPrint: `${siteName.toUpperCase()} 400` }}
        sizes="(min-width: 768px) 50vw, 100vw"
        headingLevel="h2"
        intro={
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{t('eyebrow')}</p>
            <h1 id="home-title" className={styles.title}>
              {t('title')}
            </h1>
          </div>
        }
        captionHint={t('hint')}
        actions={
          <>
            <CopyButton
              text={s.prompt}
              variant="primary"
              size="lg"
              labels={{
                copy: d('copy.label'),
                done: d('copy.done'),
                failed: d('copy.failed'),
                failedHint: d('copy.failedHint'),
              }}
            />
            <a
              href={withBasePath(s.path)}
              className={styles.open}
              data-prefetch={withBasePath(paths.generated(promptJsonFile(locale, s.slug)))}
            >
              {t('open', { frame: s.frameNumber })}
              <ArrowRight aria-hidden="true" className={styles.arrow} />
            </a>
            {works.length > 1 && (
              <Button variant="ghost" icon={<Shuffle aria-hidden="true" />} onPress={next} data-another="">
                {t('another')}
              </Button>
            )}
          </>
        }
        footer={footer}
      />
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
