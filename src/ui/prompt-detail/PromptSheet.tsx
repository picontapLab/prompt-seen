'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { CopyButton, type CopyButtonProps } from '@/ui/feedback/CopyButton';
import { IconButton } from '@/ui/primitives/Button';
import { textDirection } from './language';
import styles from './PromptSheet.module.css';

/** Longer prompts fold to 12 lines (§11.8.3); character count stands in for wrapped lines. */
const FOLD_LINES = 12;
const FOLD_CHARACTERS = 900;

export type PromptSheetProps = {
  /** The text the copy button copies: the full prompt, whatever is folded (§11.1 "Prompt 纸张"). */
  copyText: string | (() => string);
  /** BCP 47 tag of the prompt text, which may differ from the page (§8.3). */
  language: string;
  /** The prompt language's name in the page language. */
  languageName: string;
  /** True when the page language differs, which earns the "keeps its language" note (§11.8.3). */
  showLanguageNote: boolean;
  characters: number;
  lines: number;
  /** Id of the text block: the copy button selects it after a failed copy. */
  textId: string;
  /** Id for the copy button, so the mobile action bar knows when it is on screen. */
  copyButtonId?: string;
  /** Template preview (§11.1.7 PromptSheet 模板预览): copy says what is missing instead (§11.4). */
  copyBlocked?: CopyButtonProps['blocked'];
  /** Folds long prompts (§11.8.3). Off for the editor preview, where every edit must stay in view. */
  fold?: boolean;
  /** The prompt text, plain or with annotated phrases or template variables. */
  children: ReactNode;
};

/**
 * The prompt on its paper sheet (design doc §11.1 "Prompt 纸张", §11.8.3): the prompt language
 * at the top, copy as the only primary action, the full text in the HTML (folding is CSS only)
 * and its length at the bottom. Text is never copied on click, so it selects normally.
 */
export function PromptSheet({
  copyText,
  language,
  languageName,
  showLanguageNote,
  characters,
  lines,
  textId,
  copyButtonId,
  copyBlocked,
  fold = true,
  children,
}: PromptSheetProps) {
  const t = useTranslations('detail');
  const foldable = fold && (lines > FOLD_LINES || characters > FOLD_CHARACTERS);
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState(0);

  return (
    // Two animation names in turn, so each copy restarts the flash without remounting the text.
    <section
      className={styles.sheet}
      data-flash={flash ? (flash % 2 ? 'a' : 'b') : undefined}
      aria-labelledby={`${textId}-label`}
    >
      <div className={styles.head}>
        <span className={styles.label}>
          <span id={`${textId}-label`}>{t('sheet.label', { language: languageName })}</span>
          {showLanguageNote && (
            <IconButton variant="ghost" icon={<Info />} label={t('sheet.languageNote')} className={styles.info} />
          )}
        </span>
        <CopyButton
          id={copyButtonId}
          text={copyText}
          selectOnFailId={textId}
          blocked={copyBlocked}
          labels={{
            copy: t('copy.label'),
            done: t('copy.done'),
            failed: t('copy.failed'),
            failedHint: t('copy.failedHint'),
          }}
          onResult={(state) => state === 'done' && setFlash((n) => n + 1)}
        />
      </div>
      <div
        id={textId}
        className={styles.text}
        lang={language}
        dir={textDirection(language)}
        data-folded={foldable && !expanded ? '' : undefined}
      >
        {children}
      </div>
      <div className={styles.foot}>
        <span className="tabular">{t('sheet.characters', { count: characters })}</span>
        {foldable && (
          <button
            type="button"
            className={styles.fold}
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded
              ? t('sheet.collapse')
              : lines > FOLD_LINES
                ? t('sheet.expandLines', { lines })
                : t('sheet.expand')}
          </button>
        )}
      </div>
    </section>
  );
}
