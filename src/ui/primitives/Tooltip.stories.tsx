import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Copy } from 'lucide-react';
import { useSample } from '../../../.storybook/samples';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  args: { content: '', children: <span /> },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Opens after about 500 ms of hover and at once on keyboard focus (§11.1.6). Supplementary only. */
export const Hover: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Tooltip content={s.tooltip}>
        <Button icon={<Copy aria-hidden="true" />}>{s.copy}</Button>
      </Tooltip>
    );
  },
};

/** Shown open, above and below. */
export const Open: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <div style={{ display: 'flex', gap: 'var(--space-96)', paddingBlock: 'var(--space-64)' }}>
        <Tooltip content={s.tooltip} defaultOpen>
          <Button icon={<Copy aria-hidden="true" />}>{s.copy}</Button>
        </Tooltip>
        <Tooltip content={s.tooltip} placement="top" defaultOpen>
          <Button>{s.share}</Button>
        </Tooltip>
      </div>
    );
  },
};
