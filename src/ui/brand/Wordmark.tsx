import styles from './Wordmark.module.css';

/**
 * Placeholder logo until the real one exists (§17.1): a film frame and the site name in the
 * display face. The name is set in capitals here because it is a logotype, not copy; the casing
 * rule of §11.1.2 is about translated interface text. Decorative: the link around it carries
 * the accessible name.
 */
export function Wordmark({ siteName, size = 'md' }: { siteName: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`${styles.wordmark} ${size === 'sm' ? styles.sm : ''}`} aria-hidden="true">
      <span className={styles.frame} />
      <span className={styles.name}>{siteName.toLocaleUpperCase('en-US')}</span>
    </span>
  );
}
