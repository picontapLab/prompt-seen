import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { useSample } from '../../../.storybook/samples';
import { FilterChip, RemovableChips, TagChip } from './Chip';

const meta = {
  title: 'Primitives/Chip',
  component: FilterChip,
  args: { children: 'Ink', count: 12 },
} satisfies Meta<typeof FilterChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Filter (count), tag and removable chips in every state (§11.1.7). Zero disables a filter. */
export const States: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <div style={{ display: 'grid', gap: 'var(--space-40)' }}>
        <StateGrid>
          <StateCell label="FILTER · DEFAULT">
            <FilterChip count={12}>{s.styles[0]}</FilterChip>
          </StateCell>
          <StateCell label="FILTER · HOVER">
            <Forced states={['hovered']}>
              <FilterChip count={9}>{s.styles[1]}</FilterChip>
            </Forced>
          </StateCell>
          <StateCell label="FILTER · PRESSED">
            <Forced states={['pressed']}>
              <FilterChip count={14}>{s.styles[2]}</FilterChip>
            </Forced>
          </StateCell>
          <StateCell label="FILTER · FOCUS-VISIBLE">
            <Forced states={['focus-visible']}>
              <FilterChip count={11}>{s.styles[3]}</FilterChip>
            </Forced>
          </StateCell>
          <StateCell label="FILTER · SELECTED">
            <FilterChip count={120} defaultSelected>
              {s.styles[0]}
            </FilterChip>
          </StateCell>
          <StateCell label="FILTER · DISABLED (0)">
            <FilterChip count={0} disabledReason={s.reason}>
              {s.styles[4]}
            </FilterChip>
          </StateCell>
          <StateCell label="TAG">
            <TagChip>{s.styles[1]}</TagChip>
          </StateCell>
        </StateGrid>
        <Removable />
      </div>
    );
  },
};

function Removable() {
  const s = useSample();
  const [items, setItems] = useState(() => s.styles.slice(0, 3).map((label, i) => ({ id: i, label })));
  return (
    <StateCell label="REMOVABLE · FOCUS-VISIBLE ON THE FIRST">
      <Forced states={['focused', 'focus-visible']} target="[role=row]">
        <RemovableChips
          label={s.filters}
          items={items}
          onRemove={(keys: Set<Key>) => setItems((list) => list.filter((i) => !keys.has(i.id)))}
        />
      </Forced>
    </StateCell>
  );
}
