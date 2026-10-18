import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { BottomSheet } from './BottomSheet';

const meta = {
  title: 'Primitives/BottomSheet',
  component: BottomSheet,
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile1' } },
  args: {
    label: 'Prompt preview',
    expandLabel: 'SHOW THE FULL PROMPT',
    collapseLabel: 'HIDE THE PROMPT',
    expanded: false,
    onExpandedChange: () => {},
    peek: '4.5rem',
    children: null,
  },
} satisfies Meta<typeof BottomSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = Array.from({ length: 12 }, (_, i) => (
  <p key={i} style={{ margin: 0, padding: '8px 16px' }}>
    Line {i + 1} of the docked content. The page behind stays usable while the sheet is open.
  </p>
));

function Live(args: Story['args'] & { start?: boolean }) {
  const [expanded, setExpanded] = useState(args.start ?? false);
  return (
    <div style={{ minBlockSize: '100vh', padding: 16 }}>
      <p>Page content. Drag the handle, tap it, or press Esc inside the sheet (§11.1.7).</p>
      <BottomSheet {...(args as Required<typeof args>)} expanded={expanded} onExpandedChange={setExpanded}>
        {body}
      </BottomSheet>
    </div>
  );
}

/** Collapsed: the handle and the peek. Open it by drag, tap, Enter or Space. */
export const Collapsed: Story = { render: (args) => <Live {...args} /> };

/** Open to about 85% of the height; the content scrolls inside. */
export const Expanded: Story = { render: (args) => <Live {...args} start /> };
