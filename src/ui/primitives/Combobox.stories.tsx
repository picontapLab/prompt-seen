import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { useSample } from '../../../.storybook/samples';
import { Combobox, type ComboboxOption } from './Combobox';

// Native names with the English name as a keyword, as the language switch does (§11.7).
const languages: ComboboxOption[] = [
  { id: 'en', label: 'English', keywords: 'en' },
  { id: 'zh-Hans', label: '简体中文', detail: 'Chinese (Simplified)', keywords: 'zh' },
  { id: 'es', label: 'Español', detail: 'Spanish', keywords: 'es' },
  { id: 'pt-BR', label: 'Português (Brasil)', detail: 'Portuguese', keywords: 'pt' },
  { id: 'ja', label: '日本語', detail: 'Japanese', keywords: 'ja' },
  { id: 'ko', label: '한국어', detail: 'Korean', keywords: 'ko' },
  { id: 'de', label: 'Deutsch', detail: 'German', keywords: 'de' },
  { id: 'fr', label: 'Français', detail: 'French', keywords: 'fr' },
  { id: 'ar', label: 'العربية', detail: 'Arabic', keywords: 'ar' },
];

const meta = {
  title: 'Primitives/Combobox',
  component: Combobox,
  args: { label: 'Prompt language', options: languages },
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const control = '[role="group"]';

/** Default, hover, focus, selected, invalid, disabled, quiet (header) (§11.1.7). */
export const States: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <StateGrid>
        <StateCell label="DEFAULT">
          <Combobox label={s.language} options={languages} />
        </StateCell>
        <StateCell label="HOVER">
          <Forced states={['hovered']} target={control}>
            <Combobox label={s.language} options={languages} />
          </Forced>
        </StateCell>
        <StateCell label="FOCUS-VISIBLE">
          <Forced states={['focus-within', 'focus-visible']} target={control}>
            <Combobox label={s.language} options={languages} />
          </Forced>
        </StateCell>
        <StateCell label="SELECTED">
          <Combobox label={s.language} options={languages} defaultSelectedKey="ja" />
        </StateCell>
        <StateCell label="INVALID">
          <Combobox label={s.language} options={languages} isInvalid errorMessage={s.reason} />
        </StateCell>
        <StateCell label="DISABLED">
          <Combobox label={s.language} options={languages} isDisabled defaultSelectedKey="en" />
        </StateCell>
        <StateCell label="QUIET (HEADER)">
          <Combobox label={s.language} labelHidden quiet options={languages} defaultSelectedKey="en" />
        </StateCell>
      </StateGrid>
    );
  },
};

/** Filtered by a keyword the label does not contain: "jap" finds 日本語. */
export const Searching: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <div style={{ minBlockSize: '16rem', maxInlineSize: '18rem' }}>
        <Combobox label={s.language} options={languages} defaultInputValue="jap" />
      </div>
    );
  },
};
