import Link from 'next/link';
import { useId, type CSSProperties } from 'react';
import type { ImageRef } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import styles from './RelatedRow.module.css';

export type RelatedItem = {
  href: string;
  title: string;
  image: ImageRef | null;
  /** Small monospaced line under the title, e.g. the frame number. */
  meta?: string;
};

/**
 * One row of related works at a shared height (design doc §11.8.3 "底部全宽"): widths follow
 * each work's original ratio, nothing is cropped (§10.3). On narrow screens the row scrolls
 * sideways at a fixed height. A minimal stand-in until the gallery card of step 3a.
 */
export function RelatedRow({ heading, items }: { heading: string; items: readonly RelatedItem[] }) {
  const id = useId();
  if (items.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.heading}>
        {heading}
      </h2>
      <ul className={styles.row}>
        {items.map((item) => {
          const img = item.image && getImage(item.image, 'thumbnail');
          const style = { '--r': item.image ? item.image.width / item.image.height : 1 } as CSSProperties;
          return (
            <li key={item.href} style={style}>
              <Link href={item.href} prefetch={false} className={styles.link}>
                <span className={styles.frame} style={{ background: img?.placeholder }}>
                  {img && (
                    <img
                      src={img.src}
                      srcSet={img.srcSet}
                      sizes="(min-width: 1024px) 240px, 40vw"
                      width={img.width}
                      height={img.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </span>
                <span className={styles.title}>{item.title}</span>
                {item.meta && <span className={styles.meta}>{item.meta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
