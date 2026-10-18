import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { TokenInput, type TokenInputProps } from './TokenInput';

const meta = {
  title: 'Template editor/TokenInput',
  component: TokenInput,
  args: {
    label: 'Selling points',
    description: 'Concrete details become visible; vague claims are ignored.',
    value: ['glazed by hand', 'keeps coffee warm'],
    onChange: () => {},
    maxItems: 3,
    itemMaxLength: 40,
    separator: '; ',
    lang: 'en',
  },
} satisfies Meta<typeof TokenInput>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live(props: TokenInputProps) {
  const [value, setValue] = useState<string[]>([...props.value]);
  return <TokenInput {...props} value={value} onChange={setValue} />;
}

/** Type and press Enter or ";", Backspace removes the last item, the count shows "2 / 3" (§11.1.7). */
export const Playground: Story = { render: (args) => <Live {...args} /> };

/** Default, focus, an item over its limit, full, and over the limit from a shared link (§11.4). */
export const States: Story = {
  render: (args) => (
    <StateGrid>
      <StateCell label="DEFAULT · OPTIONAL">
        <Live {...args} necessity="optional" />
      </StateCell>
      <StateCell label="FOCUS-VISIBLE (ITEM REMOVE)">
        <Forced states={['focus-visible']} target="li button">
          <Live {...args} />
        </Forced>
      </StateCell>
      <StateCell label="INVALID ITEM">
        <Live
          {...args}
          value={['glazed by hand', 'a selling point that is far longer than forty characters']}
          isInvalid
          invalidItems={[1]}
          errorMessage="Item 2 can't be longer than 40 characters (now 56)."
        />
      </StateCell>
      <StateCell label="FULL">
        <Live {...args} value={['glazed by hand', 'keeps coffee warm', 'dishwasher safe']} />
      </StateCell>
      <StateCell label="EMPTY · REQUIRED · INVALID">
        <Live
          {...args}
          value={[]}
          necessity="required"
          isInvalid
          errorMessage="Selling points is empty. Fill it in to complete the prompt."
        />
      </StateCell>
    </StateGrid>
  ),
};
