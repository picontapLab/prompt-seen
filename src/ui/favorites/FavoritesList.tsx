'use client';

import { Download, Undo2, Upload } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { feedIndexFile, feedPageFile } from '@/modules/feed/files';
import type { FeedCard, FeedIndex, FeedPage } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { GifBadge } from '@/ui/media/GifBadge';
import { paths, withBasePath } from '@/modules/url';
import { exportFavorites, favoritesStore, importFavorites, type Favorite } from '@/state/favorites/store';
import { PopupWorks } from '@/ui/detail-popup/PopupHost';
import { Card } from '@/ui/gallery/Card';
import gallery from '@/ui/gallery/Gallery.module.css';
import { loadJson } from '@/ui/gallery/prefetch';
import { Button, ButtonLink } from '@/ui/primitives/Button';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { showToast } from '@/ui/primitives/toast-queue';
import { handleRemovalsInline, onFavoriteChange } from './events';
import { FavoriteButton } from './FavoriteButton';
import styles from './Favorites.module.css';
import { cardsOn, fileDate, pagesFor, shownFavorites, type TemplateItem } from './resolve';

/** How long a removed work stays in place with its undo (§11.5: about 5 seconds). */
export const UNDO_MS = 5000;

type Type = 'all' | 'prompt' | 'template';

const noSubscription = () => () => {};

/**
 * The works saved on this device (design doc §11.5, §11.8.7), newest saved first, by type.
 * Everything here is the visitor's own: the server renders the frame of the page and this list
 * fills it after hydration (§3.4). Prompts read as in the list, from the list's own files;
 * a saved ID the current content no longer has shows as unavailable, with a way to remove it.
 * Removing a work keeps its card in place, faded, with an undo for about five seconds.
 */
export function FavoritesList({
  locale,
  buildId,
  templates,
}: {
  locale: { code: string; pathPrefix: string };
  buildId: string;
  templates: readonly TemplateItem[];
}) {
  const t = useTranslations('favorites');
  const format = useFormatter();
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const saved = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get, favoritesStore.getServerSnapshot);
  const [type, setType] = useState<Type>('all');
  const [removed, setRemoved] = useState<Favorite[]>([]);
  const timers = useRef(new Map<string, number>());

  // Removals on this page stay in place with their own undo; the shell offers no toast.
  useEffect(() => {
    const release = handleRemovalsInline();
    const off = onFavoriteChange((change) => {
      if (change.type !== 'removed') return;
      const { entry } = change;
      setRemoved((list) => [...list.filter((f) => f.id !== entry.id), entry]);
      window.clearTimeout(timers.current.get(entry.id));
      timers.current.set(
        entry.id,
        window.setTimeout(() => {
          timers.current.delete(entry.id);
          setRemoved((list) => list.filter((f) => f.id !== entry.id));
        }, UNDO_MS),
      );
    });
    const pending = timers.current;
    return () => {
      off();
      release();
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const undo = (entry: Favorite) => {
    window.clearTimeout(timers.current.get(entry.id));
    timers.current.delete(entry.id);
    favoritesStore.restore(entry);
    setRemoved((list) => list.filter((f) => f.id !== entry.id));
  };

  const shown = useMemo(() => shownFavorites(saved, removed), [saved, removed]);

  // --- Prompt cards from the list's files ------------------------------------------------------
  const [index, setIndex] = useState<FeedIndex | null>(null);
  const [cards, setCards] = useState<ReadonlyMap<string, FeedCard>>(new Map());
  /** Prompts whose cards failed to load, until a retry. */
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const promptIds = useMemo(() => shown.filter((f) => f.kind === 'prompt').map((f) => f.id), [shown]);
  const known = (id: string) => cards.has(id) || (index !== null && !index.items.some((f) => f.id === id));
  const missing = promptIds.filter((id) => !known(id));
  const missingKey = missing.join(',');
  const load = !missingKey ? 'idle' : failed === missingKey ? 'error' : 'loading';

  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    const retry = attempt > 0;
    (async () => {
      const idx = await loadJson<FeedIndex>(withBasePath(paths.generated(feedIndexFile(locale.code))), {
        buildId,
        retry,
      });
      const pages = await Promise.all(
        pagesFor(idx, missingKey.split(',')).map((n) =>
          loadJson<FeedPage>(withBasePath(paths.generated(feedPageFile(locale.code, n))), { buildId, retry }),
        ),
      );
      return { idx, found: cardsOn(pages) };
    })().then(
      ({ idx, found }) => {
        if (!live) return;
        setIndex(idx);
        setCards((have) => new Map([...have, ...found]));
      },
      () => live && setFailed(missingKey),
    );
    return () => {
      live = false;
    };
  }, [missingKey, locale.code, buildId, attempt]);

  const templateById = useMemo(() => new Map(templates.map((x) => [x.id, x])), [templates]);
  const counts = {
    all: shown.length,
    prompt: shown.filter((f) => f.kind === 'prompt').length,
    template: shown.filter((f) => f.kind === 'template').length,
  };
  const prompts = type === 'template' ? [] : shown.filter((f) => f.kind === 'prompt');
  const savedTemplates = type === 'prompt' ? [] : shown.filter((f) => f.kind === 'template');
  // Saved prompts open in the detail popup and step through in this order (§11.3, step 4a).
  const popupItems = useMemo(
    () => shown.flatMap((f) => (f.kind === 'prompt' && !f.removed && cards.has(f.id) ? [cards.get(f.id)!] : [])),
    [shown, cards],
  );

  // --- Export and import (§11.5): only IDs, kinds and times ------------------------------------
  const fileInput = useRef<HTMLInputElement>(null);
  function exportFile() {
    const blob = new Blob([JSON.stringify(exportFavorites(favoritesStore.get()), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('page.exportName', { date: fileDate(new Date()) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file: File) {
    const result = importFavorites(favoritesStore.get(), await file.text());
    if (!result.ok) {
      showToast({ title: t('page.importFailed') });
      return;
    }
    favoritesStore.replace(result.items);
    const detail = t('page.importedDetail', { already: result.already, invalid: result.invalid }).trim();
    showToast({
      tone: result.added ? 'success' : 'info',
      title: t('page.imported', { added: result.added }),
      ...(detail && { description: detail }),
    });
  }

  if (!hydrated) return <div className={styles.pending} aria-busy="true" />;

  const tools = (
    <div className={styles.tools}>
      {shown.length > 0 && (
        <Button variant="secondary" icon={<Download aria-hidden="true" />} onPress={exportFile} data-export="">
          {t('page.export')}
        </Button>
      )}
      <Button
        variant="secondary"
        icon={<Upload aria-hidden="true" />}
        onPress={() => fileInput.current?.click()}
        data-import=""
      >
        {t('page.import')}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        data-import-file=""
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importFile(file);
        }}
      />
    </div>
  );

  if (shown.length === 0)
    return (
      <>
        <section className={styles.empty} data-favorites-empty="">
          {/* An empty frame instead of an illustration (§11.1.6, §11.8.7). */}
          <span className={styles.emptyFrame} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>{t('page.empty.title')}</h2>
          <p className={styles.emptyBody}>{t('page.empty.body')}</p>
          <ButtonLink variant="primary" href={paths.promptsFiltered(locale.pathPrefix, '#sort=featured')}>
            {t('page.empty.browse')}
          </ButtonLink>
        </section>
        {tools}
      </>
    );

  const removeButton = (id: string) => (
    <Button variant="secondary" onPress={() => favoritesStore.remove(id)}>
      {t('remove')}
    </Button>
  );
  const undoButton = (entry: Favorite) => (
    <Button variant="secondary" icon={<Undo2 aria-hidden="true" />} onPress={() => undo(entry)} data-undo={entry.id}>
      {t('undo')}
    </Button>
  );

  return (
    <div className={styles.saved} data-favorites="">
      <div className={styles.bar}>
        <SegmentedControl
          label={t('page.type')}
          labelHidden
          value={type}
          onChange={setType}
          segments={(['all', 'prompt', 'template'] as const).map((id) => ({
            id,
            label: (
              <>
                {t(id === 'all' ? 'page.all' : id === 'prompt' ? 'page.prompts' : 'page.templates')}{' '}
                <span className={styles.count}>{format.number(counts[id])}</span>
              </>
            ),
            isDisabled: id !== 'all' && counts[id] === 0,
          }))}
        />
        {tools}
      </div>

      {prompts.length > 0 && (
        <section aria-labelledby="saved-prompts" className={styles.section}>
          <h2 id="saved-prompts" className={styles.sectionTitle}>
            {t('page.prompts')}
          </h2>
          {load === 'error' && (
            <p className={styles.status} role="alert">
              {t('page.failed')}{' '}
              <Button
                variant="ghost"
                onPress={() => {
                  setFailed(null);
                  setAttempt((n) => n + 1);
                }}
              >
                {t('page.retry')}
              </Button>
            </p>
          )}
          {load === 'loading' && (
            <p className={`${styles.status} after-delay`} role="status">
              {t('page.loading')}
            </p>
          )}
          <PopupWorks items={popupItems} />
          <ul className={`${gallery.gallery} ${styles.rows}`}>
            {prompts.map((f) => {
              const card = cards.get(f.id);
              if (card)
                return (
                  <li
                    key={f.id}
                    className={gallery.cell}
                    style={{ '--r': card.cover.width / card.cover.height } as CSSProperties}
                    data-removed={f.removed || undefined}
                    data-saved-entry={f.id}
                  >
                    <Card card={card} locale={locale.code} actions={f.removed ? undoButton(f) : undefined} />
                  </li>
                );
              if (!known(f.id)) return null; // still loading
              return (
                <li key={f.id} className={`${gallery.cell} ${styles.gone}`} data-saved-entry={f.id} data-unavailable="">
                  <span className={styles.goneFrame}>
                    <strong>{t('page.unavailable')}</strong>
                    <span>{t('page.unavailableBody')}</span>
                  </span>
                  {f.removed ? undoButton(f) : removeButton(f.id)}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {savedTemplates.length > 0 && (
        <section aria-labelledby="saved-templates" className={styles.section}>
          <h2 id="saved-templates" className={styles.sectionTitle}>
            {t('page.templates')}
          </h2>
          <ul className={styles.templates}>
            {savedTemplates.map((f) => {
              const item = templateById.get(f.id);
              if (!item)
                return (
                  <li key={f.id} className={styles.gone} data-saved-entry={f.id} data-unavailable="">
                    <span className={styles.goneFrame}>
                      <strong>{t('page.unavailable')}</strong>
                      <span>{t('page.unavailableBody')}</span>
                    </span>
                    {f.removed ? undoButton(f) : removeButton(f.id)}
                  </li>
                );
              const img = item.cover && getImage(item.cover, 'card');
              return (
                <li key={f.id} data-removed={f.removed || undefined} data-saved-entry={f.id}>
                  <article className={styles.template} data-save-scope="">
                    <a href={withBasePath(item.path)} className={styles.templateLink}>
                      {img && (
                        <span
                          className={styles.templateFrame}
                          style={{ '--w': img.width, '--h': img.height, background: img.placeholder } as CSSProperties}
                        >
                          <img
                            src={img.src}
                            srcSet={img.srcSet}
                            sizes="(min-width: 768px) 30vw, 90vw"
                            width={img.width}
                            height={img.height}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      )}
                      <span className={styles.templateTitle}>
                        {item.title} <GifBadge image={item.cover} hasGifOutput={item.hasGifOutput} />
                      </span>
                    </a>
                    <span className={styles.templateMeta}>{t('page.fields', { count: item.fieldCount })}</span>
                    <div className={styles.templateActions}>
                      {f.removed ? (
                        undoButton(f)
                      ) : (
                        <FavoriteButton
                          id={item.id}
                          kind="template"
                          title={item.title}
                          labels={{ save: t('save'), saved: t('saved') }}
                        />
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
