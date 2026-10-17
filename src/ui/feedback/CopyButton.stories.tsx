import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StateCell, StateGrid } from '../../../.storybook/states';
import { CopyButton, type CopyState } from './CopyButton';

const labels = {
  copy: 'Copy prompt',
  done: 'Copied',
  failed: "Couldn't copy",
  failedHint: 'Select the prompt text and copy it with your keyboard or menu.',
};

const meta = {
  title: 'Feedback/CopyButton',
  component: CopyButton,
  args: { text: 'A quiet ink portrait on warm paper.', labels },
} satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Press it: the label and icon change in place, the width stays (§11.1.7). */
export const Playground: Story = {};

/** Every state at the same width; a failure explains how to copy by hand (§11.7). */
export const States: Story = {
  render: (args) => (
    <StateGrid>
      {(['idle', 'done', 'failed'] as CopyState[]).map((state) => (
        <StateCell key={state} label={state.toUpperCase()}>
          <CopyButton {...args} defaultState={state} />
        </StateCell>
      ))}
    </StateGrid>
  ),
};
