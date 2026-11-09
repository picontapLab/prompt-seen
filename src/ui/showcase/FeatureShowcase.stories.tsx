import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight } from 'lucide-react';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { ButtonLink } from '@/ui/primitives/Button';
import { FeatureShowcase } from './FeatureShowcase';
import { jazzShowcase } from './fixtures';

const meta = {
  title: 'Showcase/FeatureShowcase',
  component: FeatureShowcase,
  args: { showcase: jazzShowcase, locale: 'en' },
  parameters: { layout: 'padded' },
  // The showcase lays itself out by the width of its parent (a container query).
  decorators: [(Story) => <div style={{ containerType: 'inline-size' }}>{Story()}</div>],
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

/**
 * The home first screen as built (§11.8.1, §11.1.9): the work on film with edge print, the title
 * above the quote, the hint until a phrase is current, and what follows the actions. The image
 * develops when it is still loading as the story mounts (§11.1.9 显影).
 */
export const HeroOnFilm: Story = {
  args: {
    size: 'hero',
    actions,
    priority: true,
    develop: true,
    film: { startPrint: '0045 ▸ 0045A', endPrint: 'PROMPT SEEN 400' },
    intro: (
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-display)', lineHeight: 0.92 }}>
        See what every phrase does.
      </h1>
    ),
    captionHint: 'Point at, tap or tab to a lettered phrase: its box appears on the frame.',
    footer: <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Search and use cases follow here.</p>,
  },
};

/** Narrow containers (phones): only the current box shows, its letter at the corner (§11.1.9). */
export const Narrow: Story = {
  args: { size: 'row', defaultAnnotation: 'C' },
  render: (args) => (
    <div style={{ inlineSize: 360, containerType: 'inline-size' }}>
      <FeatureShowcase {...args} />
    </div>
  ),
};
