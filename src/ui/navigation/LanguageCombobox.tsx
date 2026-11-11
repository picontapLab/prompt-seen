'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { registryCode } from '@/i18n/format-locale';
import { useMemo } from 'react';
import { builtLocales, type LocaleEntry } from '@/config';
import { paths } from '@/modules/url';
import { missingTranslationFragment, parseMissingFragment, pathInLocale } from '@/ui/pages/missing';
import { Combobox, type ComboboxOption } from '@/ui/primitives/Combobox';
import { preferencesStore } from '@/state/preferences/store';

/**
 * Language selection (§11.1.7, §11.7): a searchable list of native names, never flags. Finds a
 * language by its native name, its name in the current interface language or its code. Keeps
 * the same resource when the page has a version in that language (its hreflang alternates). A
 * page with versions but none in that language opens the missing-translation page, which lists
 * the versions there are (§11.8.7); a page without versions opens that language's home. The
 * choice is remembered, but the root always opens in the default language.
 * Loaded on first use (LanguageSwitch).
 */
export default function LanguageCombobox({ quiet = true, autoFocus }: { quiet?: boolean; autoFocus?: boolean }) {
  const t = useTranslations('shell.language');
  const uiLocale = registryCode(useLocale());
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
        if (!target || target.code === current?.code) return;
        preferencesStore.set({ language: target.code });
        router.push(targetPath(pathname, target));
      }}
    />
  );
}

/**
 * The same page in another language when it exists; the missing-translation page when this page
 * has versions but not that one; else that language's home.
 */
function targetPath(pathname: string, target: LocaleEntry): string {
  const [, first = '', ...rest] = pathname.split('/');
  const onLocalePage = builtLocales.some((l) => l.pathPrefix === first);
  const marker =
    document.querySelector('dialog[open] [data-language-links]') ?? document.querySelector('[data-language-links]');
  const links: { locale: string; path: string }[] | null = marker
    ? JSON.parse(marker.getAttribute('data-language-links')!)
    : null;
  if (!onLocalePage || rest.every((segment) => !segment)) return paths.home(target.pathPrefix);
  // On the missing-translation page itself, carry on with the page the visitor came from.
  if (rest[0] === 'translation-missing') {
    const info = parseMissingFragment(location.hash, builtLocales);
    if (!info) return paths.home(target.pathPrefix);
    return info.have.includes(target.code)
      ? pathInLocale(info.from, target.pathPrefix)
      : paths.missingTranslation(target.pathPrefix, missingTranslationFragment(info));
  }
  const available = links?.find((link) => link.locale === target.code);
  if (available) return available.path;
  if (links) {
    const have = links.map((link) => link.locale);
    return paths.missingTranslation(target.pathPrefix, missingTranslationFragment({ from: pathname, have }));
  }
  return pathInLocale(pathname, target.pathPrefix);
}
