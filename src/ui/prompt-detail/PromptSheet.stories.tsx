import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AnnotatedText } from '@/ui/annotation/AnnotatedText';
import { AnnotationNotes } from '@/ui/annotation/AnnotationNotes';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { jazzShowcase } from '@/ui/showcase/fixtures';
import { PromptSheet } from './PromptSheet';

const long = Array.from(
  { length: 16 },
  (_, i) => `Line ${i + 1}: describe the subject, light and paper texture in plain words.`,
).join('\n');

const meta = {
  title: 'Prompt detail/PromptSheet',
  component: PromptSheet,
  args: {
    copyText: jazzShowcase.prompt,
    language: 'en',
    languageName: 'English',
    showLanguageNote: false,
    characters: jazzShowcase.prompt.length,
    lines: 1,
    textId: 'story-prompt',
    children: jazzShowcase.prompt,
  },
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ maxInlineSize: '36rem' }}>{Story()}</div>],
} satisfies Meta<typeof PromptSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The paper sheet: prompt language, copy, the full text and its length (§11.8.3). */
export const Plain: Story = {};

/** On a page in another language: the prompt keeps its own, with a note (§11.8.3). */
export const OtherLanguage: Story = { args: { languageName: '英语', showLanguageNote: true } };

/** More than 12 lines: folded with CSS, the full text stays in the HTML (§11.8.3). */
export const Folded: Story = { args: { copyText: long, characters: long.length, lines: 16, children: long } };

/** Annotated phrases, lettered A–E, with their notes below (§11.1.9). */
export const Annotated: Story = {
  render: (args) => (
    <AnnotationProvider annotations={jazzShowcase.annotations} defaultCurrent="B">
      <div style={{ display: 'grid', gap: 'var(--space-20)' }}>
        <PromptSheet {...args}>
          <AnnotatedText text={jazzShowcase.prompt} />
        </PromptSheet>
        <AnnotationNotes heading="What each phrase does" promptLanguage="en" />
      </div>
    </AnnotationProvider>
  ),
};
