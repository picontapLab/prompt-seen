import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { useSample } from '../../../.storybook/samples';
import { TextField } from './TextField';

const meta = {
  title: 'Primitives/TextField',
  component: TextField,
  args: { label: 'Product name', maxLength: 40 },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const control = '[role="presentation"]';

/** Default, hover, focus, invalid, disabled, count from 80% of the limit, multi-line (§11.1.7). */
export const States: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <StateGrid>
        <StateCell label="DEFAULT">
          <TextField label={s.productName} description={s.productHelp} maxLength={40} />
        </StateCell>
        <StateCell label="HOVER">
          <Forced states={['hovered']} target={control}>
            <TextField label={s.productName} maxLength={40} />
          </Forced>
        </StateCell>
        <StateCell label="FOCUS-VISIBLE">
          <Forced states={['focus-within', 'focus-visible']} target={control}>
            <TextField label={s.productName} defaultValue={s.productValue.slice(0, 12)} maxLength={40} />
          </Forced>
        </StateCell>
        <StateCell label="COUNT ≥ 80%">
          <TextField label={s.productName} defaultValue={s.productValue.slice(0, 34)} maxLength={40} />
        </StateCell>
        <StateCell label="INVALID">
          <TextField
            label={s.productName}
            defaultValue={s.productValue}
            isInvalid
            errorMessage={s.productError}
            necessity="required"
          />
        </StateCell>
        <StateCell label="DISABLED">
          <TextField label={s.productName} defaultValue={s.productValue.slice(0, 12)} isDisabled />
        </StateCell>
        <StateCell label="OPTIONAL · MULTI-LINE">
          <TextField label={s.notes} multiline necessity="optional" />
        </StateCell>
      </StateGrid>
    );
  },
};
