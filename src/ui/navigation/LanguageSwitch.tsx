'use client';

import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { registryCode } from '@/i18n/format-locale';
import { lazy, Suspense, useState } from 'react';
import { builtLocales } from '@/config';
import fieldStyles from '@/ui/primitives/Field.module.css';

const load = () => import('./LanguageCombobox');
const LanguageCombobox = lazy(load);

/**
 * The header language control. The searchable list (LanguageCombobox, React Aria ComboBox) is
 * only loaded when the visitor reaches for it: pointing at or focusing this button starts the
 * download, pressing it swaps in the list with focus, already open (§16.4: interaction-only code
 * stays out of the first load). Looks the same before and after.
 */
export function LanguageSwitch({ quiet = true }: { quiet?: boolean }) {
  const t = useTranslations('shell.language');
  const uiLocale = registryCode(useLocale());
  const [active, setActive] = useState(false);
  const current = builtLocales.find((l) => l.code === uiLocale);
  const placeholder = (
    <div className={`${fieldStyles.field} ${quiet ? fieldStyles.quiet : ''}`}>
      <button
        type="button"
        className={fieldStyles.control}
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
        onClick={() => setActive(true)}
        aria-haspopup="listbox"
        disabled={active}
      >
        <span className={fieldStyles.input}>
          <span className="visually-hidden">{t('label')}: </span>
          {current?.nativeName}
        </span>
        <span className={fieldStyles.trigger} aria-hidden="true">
          <ChevronDown />
        </span>
      </button>
    </div>
  );
  if (!active) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <LanguageCombobox quiet={quiet} autoFocus />
    </Suspense>
  );
}
