import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { useSample } from '../../../.storybook/samples';
import { FilterChip } from './Chip';
import { ScrollRow } from './ScrollRow';

const meta = {
  title: 'Primitives/ScrollRow',
  component: ScrollRow,
  args: { labels: { previous: '', next: '' }, children: null },
} satisfies Meta<typeof ScrollRow>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A row narrower than its content (§11.9 横向滚动): the edge with more fades and a button scrolls
 * there; at the end the other button takes over. Wide enough, it is a plain row. Check RTL from
 * the toolbar: start and end swap, and so do the buttons.
 */
export const States: Story = {
  render: function Render() {
    const s = useSample();
    const t = useTranslations('primitives.scrollRow');
    const labels = { previous: t('previous'), next: t('next') };
    const chips = [...s.styles, ...s.styles].map((label, i) => (
      <FilterChip key={i} count={10 + i}>
        {label}
      </FilterChip>
    ));
    const row = { display: 'flex', gap: 'var(--space-8)', overflowX: 'auto', scrollbarWidth: 'none' } as const;
    return (
      <div style={{ display: 'grid', gap: 'var(--space-40)' }}>
        <div style={{ inlineSize: 320 }}>
          <ScrollRow labels={labels} style={row}>
            {chips}
          </ScrollRow>
        </div>
        <div style={{ inlineSize: 1200 }}>
          <ScrollRow labels={labels} style={row}>
            {chips.slice(0, 3)}
          </ScrollRow>
        </div>
      </div>
    );
  },
};
