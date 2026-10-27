'use client';

import { useTranslations } from 'next-intl';
import { conditionCount, type FacetCounts, type FeedQuery } from '@/modules/feed/query';
import { Button } from '@/ui/primitives/Button';
import { Dialog } from '@/ui/primitives/Dialog';
import { FilterGroups } from './FilterGroups';

type Term = { id: string; label: string };

/**
 * The filter bar's panel of counted chips (design doc §11.8.2): use, shape and reference image on
 * wide screens ("panel"), every condition behind the one Filters button on narrow ones ("all").
 * Loaded the first time either button is pressed (FilterBar), so the list's first load carries no
 * dialog or chip code (§16.4); it stays mounted afterwards so closing can animate.
 */
export default function FilterPanel({
  panel,
  onClose,
  styleTerms,
  useCases,
  query,
  counts,
  onChange,
  onClear,
}: {
  panel: 'panel' | 'all' | null;
  onClose: () => void;
  styleTerms: readonly Term[];
  useCases: readonly Term[];
  query: FeedQuery;
  counts: FacetCounts;
  onChange: (patch: Partial<FeedQuery>) => void;
  onClear: () => void;
}) {
  const t = useTranslations('feed.filters');
  const n = conditionCount(query);

  return (
    <Dialog
      title={panel === 'all' ? t('open') : t('panelTitle')}
      variant={panel === 'all' ? 'sheet' : 'modal'}
      isOpen={panel !== null}
      onOpenChange={(open) => !open && onClose()}
      actions={(close) => (
        <>
          {n > 0 && (
            <Button variant="ghost" onPress={onClear}>
              {t('clear')}
            </Button>
          )}
          <Button variant="primary" onPress={close} isDisabled={counts.total === 0}>
            {t('show', { count: counts.total })}
          </Button>
        </>
      )}
    >
      <FilterGroups
        withStyles={panel === 'all'}
        styleTerms={styleTerms}
        useCases={useCases}
        query={query}
        counts={counts}
        onChange={onChange}
      />
    </Dialog>
  );
}
