import { highlightParts } from './highlight-parts';
import styles from './Search.module.css';

/** A text with matched words in <mark> (§11.8.6). */
export function Highlight({ text, locale, terms }: { text: string; locale: string; terms: readonly string[] }) {
  return (
    <>
      {highlightParts(text, locale, terms).map((p, i) =>
        p.mark ? (
          <mark key={i} className={styles.mark}>
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
