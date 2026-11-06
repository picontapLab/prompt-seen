import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StateCell, StateGrid } from '../../../.storybook/states';
import { RepositoryLink } from './RepositoryLink';

const meta = { title: 'Navigation/RepositoryLink' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const link = { href: 'https://github.com/example/prompt-seen', label: 'Prompt Seen on GitHub' };

/** The tail wags once on sight and while hovered or focused; under reduced motion it stays still. */
export const Variants: Story = {
  render: () => (
    <StateGrid>
      <StateCell label="HEADER">
        <RepositoryLink {...link} />
      </StateCell>
      <StateCell label="MENU, FOOTER">
        <RepositoryLink {...link} labelled />
      </StateCell>
    </StateGrid>
  ),
};
