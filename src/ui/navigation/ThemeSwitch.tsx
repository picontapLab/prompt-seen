'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { resolveTheme, useThemePreference } from '@/state/preferences';
import { IconButton, SegmentedControl } from '@/ui/primitives';

/**
 * Header theme button (§11.8): switches between light and dark from whatever is showing. Its
 * icon and name follow the resolved theme through CSS (.when-dark / .when-light), so server
 * HTML and hydration agree whatever is stored. "System" is chosen in the footer or the menu.
 */
export function ThemeToggle() {
  const t = useTranslations('shell.theme');
  const [preference, setPreference] = useThemePreference();
  return (
    <IconButton
      variant="secondary"
      onPress={() => setPreference(resolveTheme(preference) === 'dark' ? 'light' : 'dark')}
      icon={
        <>
          <span className="when-dark">
            <Sun aria-hidden="true" />
          </span>
          <span className="when-light">
            <Moon aria-hidden="true" />
          </span>
        </>
      }
      label={
        <>
          <span className="when-dark">{t('toLight')}</span>
          <span className="when-light">{t('toDark')}</span>
        </>
      }
    />
  );
}

/** System, light or dark (§11.6.3), as a segmented control (§11.1.7). */
export function ThemeChooser({ labelHidden }: { labelHidden?: boolean }) {
  const t = useTranslations('shell.theme');
  const [preference, setPreference] = useThemePreference();
  return (
    <SegmentedControl
      label={t('label')}
      labelHidden={labelHidden}
      value={preference}
      onChange={setPreference}
      segments={[
        { id: 'system', label: t('system') },
        { id: 'light', label: t('light') },
        { id: 'dark', label: t('dark') },
      ]}
    />
  );
}
