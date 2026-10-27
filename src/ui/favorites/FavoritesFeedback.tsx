'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { paths } from '@/modules/url';
import { favoritesStore } from '@/state/favorites/store';
import { preferencesStore } from '@/state/preferences/store';
import { showToast } from '@/ui/primitives/toast-queue';
import { onFavoriteChange, removalsHandledInline } from './events';

/**
 * Feedback for saving that does not belong on the button (design doc §11.5, §11.9 一次性提示):
 * the first save ever shows a short note that saved works stay on this device, once; removing a
 * work offers an undo for about five seconds. Mounted once by the shell; renders nothing.
 */
export function FavoritesFeedback({ locale }: { locale: string }) {
  const t = useTranslations('favorites');
  const router = useRouter();

  useEffect(
    () =>
      onFavoriteChange((change) => {
        if (change.type === 'added') {
          if (preferencesStore.get().favoritesNoteSeen) return;
          preferencesStore.set({ favoritesNoteSeen: true });
          showToast({
            tone: 'success',
            title: t('note.title'),
            description: t('note.body'),
            action: { label: t('note.open'), onAction: () => router.push(paths.favorites(locale)) },
          });
          return;
        }
        if (removalsHandledInline()) return;
        const { entry } = change;
        showToast({
          title: t('removed', { title: change.title }),
          action: { label: t('undo'), onAction: () => favoritesStore.restore(entry) },
        });
      }),
    [t, router, locale],
  );
  return null;
}
