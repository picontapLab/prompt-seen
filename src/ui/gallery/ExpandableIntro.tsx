'use client';

import { useId, useState } from 'react';
import styles from './PromptList.module.css';

/**
 * The list's introduction (§11.8.2 页面头): full on wide screens; one line with a "More" button on
 * phones. The whole text is always in the HTML, folded by CSS only.
 */
export function ExpandableIntro({ text, more, less }: { text: string; more: string; less: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={styles.intro} data-open={open || undefined}>
      <p id={id} className={styles.introText}>
        {text}
      </p>
      <button
        type="button"
        className={styles.introToggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? less : more}
      </button>
    </div>
  );
}
