import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useSample } from '../../../.storybook/samples';
import { Button } from './Button';
import { Dialog } from './Dialog';

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  args: { title: '', children: null },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation (alertdialog): no outside dismissal; Esc, Cancel or Reset (§11.4, §11.7). */
export const Alert: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Dialog
        variant="alert"
        defaultOpen
        title={s.dialogTitle}
        trigger={<Button>{s.reset}</Button>}
        actions={(close) => (
          <>
            <Button variant="ghost" onPress={close}>
              {s.cancel}
            </Button>
            <Button variant="primary" onPress={close}>
              {s.reset}
            </Button>
          </>
        )}
      >
        <p>{s.dialogBody}</p>
      </Dialog>
    );
  },
};

/** Modal panel with a close button; Esc and the scrim also close it. */
export const Modal: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Dialog defaultOpen title={s.customize} trigger={<Button>{s.customize}</Button>}>
        <p>{s.dialogBody}</p>
      </Dialog>
    );
  },
};

/** Side sheet from the inline end (left in RTL), used by the mobile menu. */
export const Sheet: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Dialog variant="sheet" defaultOpen title={s.filters} trigger={<Button>{s.filters}</Button>}>
        <p>{s.dialogBody}</p>
      </Dialog>
    );
  },
};

/** Closed: only the trigger. Focus returns to it after closing. */
export const Closed: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <Dialog title={s.dialogTitle} trigger={<Button>{s.reset}</Button>}>
        <p>{s.dialogBody}</p>
      </Dialog>
    );
  },
};
