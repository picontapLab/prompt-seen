import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { useSample } from '../../../.storybook/samples';
import { Select } from './Select';

const ratios = ['4:5', '1:1', '3:2', '16:9', '21:9'].map((r) => ({ id: r, label: r }));

const meta = {
  title: 'Primitives/Select',
  component: Select,
  args: { label: 'Aspect ratio', options: ratios },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Default, hover, focus, selected, invalid, disabled; and the open list (§11.1.7). */
export const States: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <StateGrid>
        <StateCell label="DEFAULT">
          <Select label={s.aspect} options={ratios} />
        </StateCell>
        <StateCell label="HOVER">
          <Forced states={['hovered']} target="button">
            <Select label={s.aspect} options={ratios} />
          </Forced>
        </StateCell>
        <StateCell label="FOCUS-VISIBLE">
          <Forced states={['focus-visible']} target="button">
            <Select label={s.aspect} options={ratios} />
          </Forced>
        </StateCell>
        <StateCell label="SELECTED">
          <Select label={s.aspect} options={ratios} defaultSelectedKey="4:5" />
        </StateCell>
        <StateCell label="INVALID">
          <Select label={s.aspect} options={ratios} isInvalid isRequired errorMessage={s.reason} />
        </StateCell>
        <StateCell label="DISABLED">
          <Select label={s.aspect} options={ratios} isDisabled defaultSelectedKey="1:1" />
        </StateCell>
      </StateGrid>
    );
  },
};

export const Open: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <div style={{ minBlockSize: '22rem', maxInlineSize: '16rem' }}>
        <Select
          label={s.aspect}
          defaultOpen
          defaultSelectedKey="3:2"
          options={ratios.map((o) => (o.id === '21:9' ? { ...o, isDisabled: true } : o))}
        />
      </div>
    );
  },
};
