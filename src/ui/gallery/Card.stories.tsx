import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties } from 'react';
import { slimImage } from '@/modules/feed/compose';
import type { FeedCard } from '@/modules/feed/types';
import { favoritesStore } from '@/state/favorites/store';
import { jazzCover } from '@/ui/showcase/fixtures';
import { StateCell, StateGrid } from '../../../.storybook/states';
import { Card } from './Card';
import gallery from './Gallery.module.css';

// Cards of the justified rows (§11.1.4, §11.8.2). Pointing at a card (fine pointers) lifts it,
// draws the crop marks, underlines the title and swaps the facts for the prompt's opening;
// keyboard focus rings the frame and draws the marks.

const card = (over: Partial<FeedCard> = {}): FeedCard => ({
  id: 'p_045',
  slug: 'jazz-club-poster',
  path: '/en/prompts/jazz-club-poster/',
  title: 'Jazz club poster',
  frameNumber: '0045',
  cover: slimImage(jazzCover),
  ratio: '3:4',
  model: 'Sample Renderer 1',
  verification: 'verified',
  lastTestedAt: '2026-10-02',
  promptLanguage: 'en',
  promptOpening: 'Flat vector poster for a late-night jazz club, navy ground with a mustard disc.',
  ...over,
});

const meta = {
  title: 'Gallery/Card',
  component: Card,
  args: { card: card(), locale: 'en' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

// The "saved" sample is saved in this browser's favourites, so its button and circle show it.
if (typeof window !== 'undefined' && !favoritesStore.has('p_story_saved'))
  favoritesStore.add('p_story_saved', 'prompt');

/** One card at a medium width. */
export const Default: Story = {
  render: (args) => (
    <div style={{ inlineSize: 240 }}>
      <Card {...args} />
    </div>
  ),
};

/** Unverified (no model shown), a long title cut to one line, and the favourite slot of step 4c. */
export const States: Story = {
  render: (args) => (
    <StateGrid>
      <StateCell label="NOT VERIFIED">
        <div style={{ inlineSize: 200 }}>
          <Card {...args} card={card({ verification: 'unknown', model: null, lastTestedAt: null })} />
        </div>
      </StateCell>
      <StateCell label="LONG TITLE">
        <div style={{ inlineSize: 200 }}>
          <Card {...args} card={card({ title: 'A very long title that cannot fit on one line of the label' })} />
        </div>
      </StateCell>
      <StateCell label="SAVED (CIRCLED FRAME NUMBER)">
        <div style={{ inlineSize: 200 }}>
          <Card {...args} card={card({ id: 'p_story_saved', title: 'Saved in this browser' })} />
        </div>
      </StateCell>
      <StateCell label="NO ACTIONS">
        <div style={{ inlineSize: 200 }}>
          <Card {...args} actions={null} />
        </div>
      </StateCell>
    </StateGrid>
  ),
};

/**
 * A justified row: widths follow each work's ratio, every row one height, nothing cropped.
 * Resize the canvas to see rows re-flow; the last row keeps its cards near the row height.
 */
export const JustifiedRows: Story = {
  render: (args) => (
    <div
      className={gallery.gallery}
      role="feed"
      aria-label="Prompts"
      style={{ '--row-height': '180px' } as CSSProperties}
    >
      {[...Array(7)].map((_, i) => (
        <Card
          key={i}
          {...args}
          card={card({ id: `p_0${40 + i}`, frameNumber: `00${40 + i}` })}
          className={gallery.cell}
          posinset={i + 1}
          setsize={7}
        />
      ))}
    </div>
  ),
};
