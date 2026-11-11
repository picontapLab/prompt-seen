'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lazy, Suspense, useState } from 'react';
import { IconButton } from '@/ui/primitives/Button';

const load = () => import('./MenuSheet');
const MenuSheet = lazy(load);

export type MenuLink = { key: string; href: string; label: string };
export type RepositoryMenuLink = { href: string; label: string };

/**
 * Menu for narrow screens (§11.2, §11.8.2): the sections, language and theme in a side sheet.
 * Footer links are repeated here so they stay reachable above an endless list. The sheet loads
 * on first open; it stays mounted afterwards so closing can animate.
 */
export function MobileMenu({
  links,
  repository,
  suggestedLanguageLabel,
}: {
  links: readonly MenuLink[];
  repository?: RepositoryMenuLink | null;
  suggestedLanguageLabel: string;
}) {
  const t = useTranslations('shell.menu');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <IconButton
        variant="ghost"
        tooltip={false}
        icon={<Menu aria-hidden="true" />}
        label={t('open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onHoverStart={() => void load()}
        onPress={() => {
          setLoaded(true);
          setOpen(true);
        }}
      />
      {loaded && (
        <Suspense>
          <MenuSheet
            links={links}
            repository={repository}
            suggestedLanguageLabel={suggestedLanguageLabel}
            isOpen={open}
            onOpenChange={setOpen}
          />
        </Suspense>
      )}
    </>
  );
}
