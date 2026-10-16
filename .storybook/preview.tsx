import '../src/styles/global.css';
import '../src/styles/fonts';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import { useLayoutEffect, type ReactNode } from 'react';
import { MotionProvider } from '../src/ui/motion';
import { PrimitivesProvider } from '../src/ui/primitives';
import { catalogs, storyLocales, type StoryLocale } from './messages';
import styles from './preview.module.css';

type Globals = { theme: 'light' | 'dark' | 'both'; locale: StoryLocale; motion: 'normal' | 'reduce' };

// Puts the preview document in the chosen language, direction, theme and motion mode, the same
// attributes the site uses (§8.6, §11.6.3, §12.7). "both" shows light and dark side by side.
function Modes({ theme, locale, motion, children }: Globals & { children: (scheme: 'light' | 'dark') => ReactNode }) {
  const entry = storyLocales[locale];
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = entry.htmlLang;
    root.dir = entry.direction;
    if (theme === 'both') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    if (motion === 'reduce') root.setAttribute('data-motion', 'reduce');
    else root.removeAttribute('data-motion');
  }, [entry, theme, motion]);
  const panel = (scheme: 'light' | 'dark') => (
    <div data-theme={scheme} className={styles.panel}>
      {children(scheme)}
    </div>
  );
  return (
    <NextIntlClientProvider locale={entry.code} messages={catalogs[locale]} timeZone="UTC">
      <PrimitivesProvider locale={entry.htmlLang}>
        <MotionProvider reducedMotion={motion === 'reduce' ? 'always' : 'user'}>
          {theme === 'both' ? (
            <div className={styles.both}>
              {panel('light')}
              {panel('dark')}
            </div>
          ) : (
            panel(theme)
          )}
        </MotionProvider>
      </PrimitivesProvider>
    </NextIntlClientProvider>
  );
}

const withModes: Decorator = (Story, { globals }) => <Modes {...(globals as Globals)}>{() => <Story />}</Modes>;

const preview: Preview = {
  decorators: [withModes],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light (photo paper)' },
          { value: 'both', title: 'Light and dark side by side' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Language and direction',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English (LTR)' },
          { value: 'zh-Hans', title: '简体中文' },
          { value: 'ja', title: '日本語' },
          { value: 'ar', title: 'العربية (RTL)' },
        ],
        dynamicTitle: true,
      },
    },
    motion: {
      description: 'Motion',
      toolbar: {
        title: 'Motion',
        icon: 'play',
        items: [
          { value: 'normal', title: 'Normal motion' },
          { value: 'reduce', title: 'Reduced motion' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'both', locale: 'en', motion: 'normal' },
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
};

export default preview;
