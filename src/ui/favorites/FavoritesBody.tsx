import 'server-only';
import { getTranslations } from 'next-intl/server';
import { config, type LocaleEntry } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { listEntries } from '@/modules/content';
import type { TemplateSummary } from '@/modules/content/types';
import { slimImage } from '@/modules/feed/compose';
import { popupLocale } from '@/ui/detail-popup/logic';
import { PopupHost } from '@/ui/detail-popup/PopupHost';
import styles from './Favorites.module.css';
import { FavoritesList } from './FavoritesList';
import type { TemplateItem } from './resolve';

/**
 * /{locale}/favorites/ (design doc §11.5, §11.8.7; noindex): the page's head says that saved
 * works stay on this device; the list itself is the visitor's and fills in after hydration.
 * Saved prompts open in the detail popup (step 4a).
 */
export async function FavoritesBody({ locale }: { locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'favorites.page' });
  // Templates are few: their cards travel with the page. Prompts come from the list's files.
  const templates: TemplateItem[] = listEntries({ locale: locale.code, kind: 'template' }).map(
    (x: TemplateSummary) => ({
      id: x.id,
      path: x.path,
      title: x.title,
      fieldCount: x.fieldCount,
      hasGifOutput: x.hasGifOutput,
      cover: x.cover && slimImage(x.cover),
    }),
  );
  return (
    <div className="container" data-page="favorites">
      <header className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.device}>{t('device')}</p>
      </header>
      <ClientMessages namespaces={['favorites', 'feed', 'detail', 'popup', 'shortcuts']}>
        <PopupHost locale={popupLocale(locale)} siteName={config.siteName}>
          <FavoritesList
            locale={{ code: locale.code, pathPrefix: locale.pathPrefix }}
            buildId={config.buildId}
            templates={templates}
          />
        </PopupHost>
      </ClientMessages>
    </div>
  );
}
