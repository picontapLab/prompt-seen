import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { localeByCode } from '@/config';
import type { SearchHit } from '@/modules/search/types';
import { jazzCover } from '@/ui/showcase/fixtures';
import { StateCell, StateGrid } from '../../../.storybook/states';
import { NoResults, SearchFailure } from './NoResults';
import { ResultRow } from './ResultRow';
import panel from './QuickSearch.module.css';
import page from './SearchPage.module.css';

// Search results (§11.8.6): a row as the quick panel and the search page show it, with matched
// words marked; the help shown when nothing is found; and the failed and stale index states
// (§13.3). The panel itself needs the Worker and an index, so it is covered end to end.

const thumb = jazzCover.variants.thumbnail!;
const hit = (over: Partial<SearchHit> = {}): SearchHit => ({
  id: 'prompt:p_045',
  kind: 'prompt',
  score: 1,
  matched: ['jazz', 'poster'],
  title: 'Jazz club poster',
  description: 'A flat vector poster for a late-night jazz club, for event posters and art prints.',
  path: '/en/prompts/jazz-club-poster/',
  frame: '0045',
  thumb: { key: thumb.key, width: thumb.width, height: thumb.height, placeholder: jazzCover.placeholder },
  tags: ['Poster', 'Flat vector', 'Event poster'],
  ...over,
});

const meta = {
  title: 'Search/Results',
  component: ResultRow,
  args: { hit: hit(), locale: 'en' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ResultRow>;
export default meta;
type Story = StoryObj<typeof meta>;

/** In the quick panel: title and facts; and on the search page, with the summary. */
export const Rows: Story = {
  render: (args) => (
    <StateGrid>
      <StateCell label="PANEL">
        <div className={panel.item} style={{ inlineSize: 420 }}>
          <ResultRow {...args} />
        </div>
      </StateCell>
      <StateCell label="PANEL, FOCUSED">
        <div className={panel.item} data-focused="true" style={{ inlineSize: 420 }}>
          <ResultRow {...args} />
        </div>
      </StateCell>
      <StateCell label="PAGE">
        <div className={page.result} style={{ inlineSize: 560 }}>
          <ResultRow {...args} description />
        </div>
      </StateCell>
      <StateCell label="TEMPLATE, NO PICTURE">
        <div className={page.result} style={{ inlineSize: 560 }}>
          <ResultRow
            {...args}
            hit={hit({ kind: 'template', frame: null, thumb: null, title: 'Product poster' })}
            description
          />
        </div>
      </StateCell>
      <StateCell label="CJK">
        <div className={page.result} style={{ inlineSize: 560 }}>
          <ResultRow
            hit={hit({
              title: '爵士俱乐部海报',
              description: '扁平矢量风格的深夜爵士俱乐部海报。',
              matched: ['海报'],
              tags: ['海报'],
            })}
            locale="zh-Hans"
            description
          />
        </div>
      </StateCell>
    </StateGrid>
  ),
};

const en = localeByCode('en')!;

/** Nothing found: fewer words, close labels and other languages, then the whole list. */
export const NothingFound: Story = {
  render: () => (
    <div style={{ inlineSize: 560 }}>
      <NoResults
        locale={en}
        query="neon jazz posterr"
        help={{
          broader: [{ word: 'neon', total: 10 }],
          terms: [{ label: 'Poster', total: 15 }],
          otherLocales: [{ locale: 'zh-Hans', total: 4 }],
        }}
        onQuery={() => {}}
      />
    </div>
  ),
};

/** The index failed to load, and the index belongs to another deployment. */
export const Failures: Story = {
  render: () => (
    <StateGrid>
      <StateCell label="FAILED">
        <SearchFailure error="network" onRetry={() => {}} />
      </StateCell>
      <StateCell label="SITE UPDATED">
        <SearchFailure error="stale" onRetry={() => {}} />
      </StateCell>
    </StateGrid>
  ),
};
