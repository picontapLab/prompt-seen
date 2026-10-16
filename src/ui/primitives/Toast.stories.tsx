import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { useSample } from '../../../.storybook/samples';
import { Button } from './Button';
import { showToast, toastQueue } from './toast-queue';

const meta = { title: 'Primitives/Toast', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Info, success and undoable toasts in the polite region (§11.1.7). Shown without a timeout. */
export const Variants: Story = {
  render: function Render() {
    const s = useSample();
    useEffect(() => {
      const keys = [
        showToast({ title: s.removed, action: { label: s.undo, onAction: () => {} } }, 0),
        showToast({ title: s.saved, description: s.savedDetail, tone: 'success' }, 0),
        showToast({ title: s.share, tone: 'info' }, 0),
      ];
      return () => keys.forEach((k) => toastQueue.close(k));
    }, [s]);
    return <div style={{ minBlockSize: '20rem' }} />;
  },
};

/** Press to queue one; it closes after its timeout unless hovered or focused. */
export const Trigger: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Button onPress={() => showToast({ title: s.removed, action: { label: s.undo, onAction: () => {} } })}>
        {s.save}
      </Button>
    );
  },
};
