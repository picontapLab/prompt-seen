import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight } from 'lucide-react';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { ButtonLink } from '@/ui/primitives/Button';
import { FeatureShowcase } from './FeatureShowcase';
import { jazzShowcase } from './fixtures';

const meta = {
  title: 'Showcase/FeatureShowcase',
  component: FeatureShowcase,
  args: { showcase: jazzShowcase },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FeatureShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;

const actions = (
  <>
    <CopyButton
      text={jazzShowcase.prompt}
      labels={{
        copy: 'Copy prompt',
        done: 'Copied',
        failed: "Couldn't copy",
        failedHint: 'Select the text to copy it.',
      }}
    />
    <ButtonLink href="#" variant="ghost" icon={<ArrowRight aria-hidden="true" />}>
      View details
    </ButtonLink>
  </>
);

/**
 * A feature row or the list's showcase band (§11.8.2). Point at, focus or tap a phrase: its
 * region is framed with crop marks and a leader to its letter, and its note shows below.
 */
export const Row: Story = { args: { size: 'row', actions } };

/** The home first screen (§11.8.1), opening on phrase A. */
export const Hero: Story = { args: { size: 'hero', actions, priority: true, defaultAnnotation: 'A' } };

/** Narrow containers (phones): only the current box shows, its letter at the corner (§11.1.9). */
export const Narrow: Story = {
  args: { size: 'row', defaultAnnotation: 'C' },
  render: (args) => (
    <div style={{ inlineSize: 360 }}>
      <FeatureShowcase {...args} />
    </div>
  ),
};
