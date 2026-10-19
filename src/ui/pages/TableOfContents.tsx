'use client';

import { useEffect, useId, useState } from 'react';
import type { TocItem } from '@/modules/content/types';
import styles from './Pages.module.css';

/**
 * The sticky contents list of long pages (design doc §11.8.5): desktop only, with the section
 * being read marked by the `mark` underline (§11.1.9 当前位置下划线). The links work without
 * JavaScript; after hydration the current section follows scrolling. Hidden below 1024 px by CSS.
 */
export function TableOfContents({ items, label }: { items: readonly TocItem[]; label: string }) {
  const id = useId();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((h): h is HTMLElement => !!h);
    if (!headings.length || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    // A heading counts as current from when it passes the top fifth of the viewport until the
    // next one does; the last heading above that line wins when none is in the band. At the end
    // of the page the last section is current, even if its heading cannot scroll that far up.
    const update = () => {
      const line = window.innerHeight * 0.2;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) {
        const shown = headings.filter((h) => h.getBoundingClientRect().top < window.innerHeight);
        if (shown.length) return setCurrent(shown[shown.length - 1]!.id);
      }
      let last: string | null = null;
      for (const h of headings) if (h.getBoundingClientRect().top <= line) last = h.id;
      setCurrent(last ?? (visible.size ? headings.find((h) => visible.has(h.id))!.id : null));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        update();
      },
      { rootMargin: '0px 0px -60% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav className={styles.toc} aria-labelledby={id}>
      <h2 id={id} className={styles.tocLabel}>
        {label}
      </h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={current === item.id ? 'location' : undefined}>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
