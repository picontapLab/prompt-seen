'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { builtLocales, type LocaleEntry } from '@/config';
import { paths } from '@/modules/url';
import { Combobox, type ComboboxOption } from '@/ui/primitives/Combobox';

/**
 * Language selection (§11.1.7, §11.7): a searchable list of native names, never flags. Finds a
 * language by its native name, its name in the current interface language or its code. Keeps
 * the same resource when the page has a version in that language (its hreflang alternates),
 * otherwise opens that language's home page. Loaded on first use (LanguageSwitch).
 */
export default function LanguageCombobox({ quiet = true, autoFocus }: { quiet?: boolean; autoFocus?: boolean }) {
  const t = useTranslations('shell.language');
  const uiLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const current = builtLocales.find((l) => l.code === uiLocale);

  const options = useMemo<ComboboxOption[]>(() => {
    // Interface-language names only matter for searching and appear in the open list, which
    // renders on the client alone, so they cannot cause a hydration difference.
    let names: Intl.DisplayNames | undefined;
    try {
      names = new Intl.DisplayNames([uiLocale], { type: 'language' });
    } catch {
      names = undefined;
    }
    return builtLocales.map((l) => {
      const translated = names?.of(l.htmlLang);
      return {
        id: l.code,
        label: l.nativeName,
        detail: translated && translated !== l.nativeName ? translated : undefined,
        keywords: `${l.code} ${new Intl.DisplayNames(['en'], { type: 'language' }).of(l.htmlLang) ?? ''}`,
      };
    });
  }, [uiLocale]);

  return (
    <Combobox
      label={t('label')}
      labelHidden
      quiet={quiet}
      options={options}
      selectedKey={current?.code ?? null}
      autoFocus={autoFocus}
      onSelectionChange={(key) => {
        const target = builtLocales.find((l) => l.code === key);
        if (target && target.code !== current?.code) router.push(targetPath(pathname, target));
      }}
    />
  );
}

/** The same page in another language when it exists, else that language's home. */
function targetPath(pathname: string, target: LocaleEntry): string {
  const [, first = '', ...rest] = pathname.split('/');
  const onLocalePage = builtLocales.some((l) => l.pathPrefix === first);
  const alternates = new Set(
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')].map((l) => l.hreflang),
  );
  if (onLocalePage && alternates.has(target.htmlLang)) return `/${[target.pathPrefix, ...rest].join('/')}`;
  return paths.home(target.pathPrefix);
}
