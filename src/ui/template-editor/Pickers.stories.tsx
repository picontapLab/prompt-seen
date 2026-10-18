import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ComponentProps } from 'react';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { AspectRatioPicker, SwatchPicker } from './Pickers';

const ratios = ['4:5', '1:1', '16:9', '21:9', '1:3'].map((value) => ({ value, label: value }));
const palettes = [
  { value: 'warm neutral', label: 'Warm neutral', swatch: ['#E8DCC8', '#B9A58E', '#3E3129'] },
  { value: 'sage green', label: 'Sage green', swatch: ['#DCE6DD', '#6E9C88', '#2F5D50'] },
  { value: 'midnight blue', label: 'Midnight blue', swatch: ['#1F2A44', '#76C3B7', '#F3ECE2'] },
  { value: 'soft grey', label: 'Soft grey', swatch: ['#E2E2E0', '#555555', '#1A1A1A'] },
];

const meta = {
  title: 'Template editor/Pickers',
  component: AspectRatioPicker,
  args: { label: 'Aspect ratio', options: ratios, value: '4:5', onChange: () => {} },
} satisfies Meta<typeof AspectRatioPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live({ kind, ...props }: ComponentProps<typeof AspectRatioPicker> & { kind: 'ratio' | 'swatch' }) {
  const [value, setValue] = useState(props.value);
  const Picker = kind === 'ratio' ? AspectRatioPicker : SwatchPicker;
  return <Picker {...props} value={value} onChange={setValue} />;
}

/** Ratios drawn at their proportions; palettes as their colours (§11.8.4 控件选择). */
export const Playground: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 32 }}>
      <Live {...args} kind="ratio" />
      <Live {...args} kind="swatch" label="Palette" options={palettes} value="warm neutral" />
    </div>
  ),
};

/** Selected (safelight underline), hover, pressed, focus-visible and disabled (§11.1.7). */
export const States: Story = {
  render: (args) => (
    <StateGrid>
      <StateCell label="SELECTED · DEFAULT">
        <Live {...args} kind="ratio" />
      </StateCell>
      <StateCell label="HOVER (LIGHT)">
        <Forced states={['hovered']} target="label:nth-child(2)">
          <Live {...args} kind="swatch" label="Palette" options={palettes} value="warm neutral" />
        </Forced>
      </StateCell>
      <StateCell label="PRESSED">
        <Forced states={['pressed']} target="label:nth-child(2)">
          <Live {...args} kind="ratio" />
        </Forced>
      </StateCell>
      <StateCell label="FOCUS-VISIBLE">
        <Forced states={['focus-visible']} target="label[data-selected]">
          <Live {...args} kind="swatch" label="Palette" options={palettes} value="sage green" />
        </Forced>
      </StateCell>
      <StateCell label="DISABLED">
        <Live {...args} kind="ratio" isDisabled />
      </StateCell>
    </StateGrid>
  ),
};
