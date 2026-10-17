import Link from 'next/link';
import styles from './Breadcrumb.module.css';

export type Crumb = { label: string; href: string | null };

/**
 * Breadcrumb (design doc §9.2, §11.1.7). Items without an address are shown as text: a crumb
 * links only to a page that exists in this build. Structured data (step 3b) lists the same items.
 */
export function Breadcrumb({ items, label }: { items: readonly Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className={styles.crumbs}>
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <Link href={item.href} prefetch={false}>
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
