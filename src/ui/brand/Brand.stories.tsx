import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StateCell, StateGrid } from '../../../.storybook/states';
import { CropMarks } from './CropMarks';
import { FilmStrip } from './FilmStrip';
import { FrameNumber } from './FrameNumber';
import { Wordmark } from './Wordmark';

const meta = { title: 'Brand/Elements' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// A dominant-colour frame stands in for artwork (§11.9 主色占位); stories carry no sample images.
const Frame = ({ w, h, color, size = '22rem' }: { w: number; h: number; color: string; size?: string }) => (
  <div
    role="img"
    aria-label={`${w}:${h} frame`}
    style={{ aspectRatio: `${w} / ${h}`, inlineSize: size, maxInlineSize: '100%', background: color }}
  />
);

/** Film edge with sprocket holes and edge print, dark in both themes (§11.1.9). */
export const FilmEdge: Story = {
  render: () => (
    <div style={{ maxInlineSize: '44rem' }}>
      <FilmStrip startPrint="27 ▸ 27A" endPrint="PROMPT SEEN 400">
        <Frame w={4} h={5} color="#2b3550" />
      </FilmStrip>
    </div>
  ),
};

/** Narrow strips keep the holes even; edge print appears from the md breakpoint. */
export const FilmEdgeWidths: Story = {
  render: () => (
    <StateGrid>
      {[240, 320, 480].map((w) => (
        <StateCell key={w} label={`${w}PX`}>
          <div style={{ inlineSize: w }}>
            <FilmStrip startPrint="12 ▸ 12A" endPrint="PROMPT SEEN 400">
              <Frame w={3} h={2} color="#5b4a3a" />
            </FilmStrip>
          </div>
        </StateCell>
      ))}
    </StateGrid>
  ),
};

/** Frame numbers in safelight amber: bare on cards, labelled in captions, on the film edge. */
export const FrameNumbers: Story = {
  render: () => (
    <StateGrid>
      <StateCell label="CARD">
        <FrameNumber n={127} />
      </StateCell>
      <StateCell label="CAPTION">
        <FrameNumber n={127} labelled />
      </StateCell>
      <StateCell label="ON FILM">
        <span style={{ background: 'var(--film)', padding: 'var(--space-8)' }}>
          <FrameNumber n={9} onFilm labelled />
        </span>
      </StateCell>
    </StateGrid>
  ),
};

/** Crop marks: always shown (annotation box) and interactive (cards, on hover or focus). */
export const CropMarksStates: Story = {
  name: 'Crop marks',
  render: () => (
    <StateGrid>
      <StateCell label="ALWAYS">
        <div style={{ position: 'relative', inlineSize: 'fit-content', margin: 'var(--space-16)' }}>
          <Frame w={1} h={1} color="#e8e4dc" size="9rem" />
          <CropMarks />
        </div>
      </StateCell>
      <StateCell label="INTERACTIVE · HOVER OR FOCUS">
        <a
          href="#frame"
          data-crop-target=""
          style={{ position: 'relative', display: 'block', inlineSize: 'fit-content', margin: 'var(--space-16)' }}
        >
          <Frame w={3} h={2} color="#3c4a3a" size="10rem" />
          <CropMarks mode="interactive" size={14} />
        </a>
      </StateCell>
      <StateCell label="INTERACTIVE · ACTIVE">
        <div
          data-crop-target=""
          data-crop-active=""
          style={{ position: 'relative', inlineSize: 'fit-content', margin: 'var(--space-16)' }}
        >
          <Frame w={4} h={5} color="#f4f1ea" size="8rem" />
          <CropMarks mode="interactive" size={14} />
        </div>
      </StateCell>
    </StateGrid>
  ),
};

/** Placeholder wordmark until the logo exists (§17.1). */
export const WordmarkSizes: Story = {
  name: 'Wordmark',
  render: () => (
    <StateGrid>
      <StateCell label="HEADER">
        <Wordmark siteName="Prompt Seen" />
      </StateCell>
      <StateCell label="FOOTER">
        <Wordmark siteName="Prompt Seen" size="sm" />
      </StateCell>
    </StateGrid>
  ),
};
